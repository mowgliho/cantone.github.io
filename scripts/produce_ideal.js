class IdealProducer {
  tones = ['t1','t2','t3','t4','t5','t6'];

  constructor(document, startAudio) {
    const that = this;

    //tone selector
    let selector = document.getElementById("produce-ideal-tone");
    for(const tone of ['None'].concat(this.tones)) {
      let opt = document.createElement('option');
      opt.value = tone;
      opt.innerHTML = tone;
      selector.appendChild(opt);
    }
    this.tone = selector.value;
    selector.onchange = function(val) { that.tone = selector.value; that.innerUpdate();};

    //define nodes
    that.nodes = {}
    for(const x of ['start','main','end']) {
      const canvas = document.getElementById('produce-ideal-' + x + '-col');
      const type = x == 'main'? 'trace':'line';
      const button = document.getElementById("produce-ideal-" + x + "-button")
      const contourFn = x == 'start'? function(c) { return([c[0],c[0]])}: 
        x == 'main'? function(c) { return([c[0],c[1]])}:
        function(c) {return([c[1],c[1]])};
      that.nodes[x] = new IdealAudioNode(contourFn, canvas, type, button, startAudio);
    }
  }

  update(mean, sd) {
    this.mean = mean;
    this.sd = sd;
    this.innerUpdate();
  }

  innerUpdate() {
    const tone = (this.tones.includes(this.tone) && this.calibrated)? this.tone: null;
    for(const [key, node] of Object.entries(this.nodes)) {
      node.update(this.tone, this.mean, this.sd);
    }
  }
}


//called by initializeIdeal and put into a dict of [start, main, end] to thingie
//parameter stuff is changed aboot using updateIdeal
//actual audioNode is made via the audioContext that we obtain via startAudio
//(when update, update the audioNode itself if it exists already. If not, update when we get the audioContext)
class IdealAudioNode {
  mean;
  sd;

  guideNode;
  timeouts = [];
  recording;

  constructor(contourFn, canvas, type, button, startAudio) {
    const that = this;
    this.recording = false;
    this.contourFn = contourFn;
    this.contour = null;
    this.canvas = canvas;
    this.type = type;
    this.button = button;
    this.button.onclick = startAudio(
      function(audioContext,stream) {
        that.start(audioContext, stream);
      }
    );
  }
  
  update(tone, mean, sd) {
    this.tone = tone;
    this.mean = mean;
    this.sd = 4;//TODO get standard deviation defined non-statically
    if(Object.keys(IdealAudioNode.idealTones).includes(this.tone)) {
      const rawContour = this.contourFn(IdealAudioNode.idealTones[tone]);
      this.contour = [rawContour[0]/IdealAudioNode.height + 0.5, rawContour[1]/IdealAudioNode.height + 0.5];
      IdealAudioNode.drawLine(this.canvas, this.contour, null);
    } else {
      IdealAudioNode.clearCanvas(this.canvas);
    }
  }

  //type is either 'line' or 'trace'
  start = (audioContext, stream) => {
    console.log('start');
    if(!Object.keys(IdealAudioNode.idealTones).includes(this.tone)) return;
    if(this.recording) return;
    this.recording = true;

    let that = this;

    //setup recording/analyzing
    let analyzer = audioContext.createAnalyser();
    analyzer.fftsize = Math.pow(2,9);
    audioContext.createMediaStreamSource(stream).connect(analyzer)
    let sampleRate = audioContext.sampleRate;
    let data = new Float32Array(analyzer.fftSize)

    let intervalFn;
    let guideTime;
    if(this.type == 'line') {
      intervalFn = this.getLineFn(that, analyzer, data, sampleRate);
    } else if(this.type == 'trace') {
      intervalFn = this.getTraceFn(that, analyzer, data, sampleRate, new Date().getTime() );
    }
    var timeMult = this.type == 'line'?0.5:1;
    // define guidetone
    const startFreq = IdealAudioNode.getFreq(this.contour[0], this.sd, this.mean);
    const endFreq = IdealAudioNode.getFreq(this.contour[1], this.sd, this.mean);
    this.guideNode = audioContext.createBufferSource();
    var buffer = audioContext.createBuffer(1, timeMult * sampleRate * IdealAudioNode.idealTime/1000, sampleRate);
    var bufferData = buffer.getChannelData(0);
    IdealAudioNode.fillContourArray(bufferData, sampleRate, startFreq, endFreq);
    this.guideNode.buffer = buffer;
    // start guidetone
    guideTime = timeMult * IdealAudioNode.idealTime;
    this.guideNode.start();
    this.guideNode.connect(audioContext.destination);

    this.timeouts.push(setInterval(intervalFn, IdealAudioNode.measurementInterval));
    this.timeouts.push(setTimeout(function() {that.stopGuide();}, guideTime));
    this.timeouts.push(setTimeout(function() {that.stop();}, IdealAudioNode.idealTime));
  }

 stopGuide = () => {
    this.guideNode.stop();
  }

  stop = () => {
    console.log('stop');
    if(!this.recording) return;
    this.recording = false;
    this.guideNode.stop()
    for(const timeout of this.timeouts) {
      clearTimeout(timeout);
    }
    this.timeouts = []
  }

  getLineFn(that, analyzer, data, sampleRate) {
    return function() {
      analyzer.getFloatTimeDomainData(data);
      let st = 49 + 12*Math.log2(yin(data, sampleRate)/440);
      let redLine = Math.max(0, Math.min(1, 0.5 + (st-that.mean)/that.sd/IdealAudioNode.height))
      IdealAudioNode.drawLine(that.canvas, that.contour, redLine);
    }
  }

  getTraceFn(that, analyzer, data, sampleRate, startTime) {
    IdealAudioNode.drawLine(that.canvas, that.contour, null);
    let ctx = that.canvas.getContext('2d');
    ctx.beginPath();
    ctx.strokeStyle = 'red';
    let cur = null;

    return function() {
      analyzer.getFloatTimeDomainData(data);
      let st = 49 + 12*Math.log2(yin(data, sampleRate)/440);
      let y = (1-Math.max(0, Math.min(1, 0.5 + (st-that.mean)/that.sd/IdealAudioNode.height))) * that.canvas.height;
      let x = ((new Date().getTime() - startTime)/IdealAudioNode.idealTime) * that.canvas.width;
      if(cur == null) {
        ctx.moveTo(x,y);
      } else {
        ctx.lineTo(x,y);
        ctx.stroke();
      }
      cur = true
    }
  }

  //static stuff
  static measurementInterval = 10;
  static idealTime = 2000;//TODO make larger, turn off if get close enough in range, changeable for main
  static idealTones = {
    t1: [2,2],
    t2: [-1,2],
    t3: [0,0],
    t4: [-1,-2],
    t5: [-1,0],
    t6: [-1,-1]
  };

  static height = 6;//number of sds tall the canvas is, with 0/mean in the middle.

  //returns start and end point of ideal tone w.r.t Chao tones in semitone space, in units of sd from mean.
  static getFreq(val, sd, mean) {
    const st = (val - 0.5)*IdealAudioNode.height * sd + mean;
    return(Math.pow(2,(st - 49)/12) * 440);
  }

  //taper in and out over 0.1s
  //does linear interpolation (in log space!)
  static fillContourArray(array, sampleRate, startFreq, endFreq) {
    const taperLength = 0.1
    const len = array.length;
    var phase = 0;
    for(var i = 0; i < len; i++) {
      const freq = Math.exp(((len - i)/len) * Math.log(startFreq) + (i/len) * Math.log(endFreq));
      phase += 2 * Math.PI * freq / sampleRate;
      const amplitude = Math.min(Math.min(1,i/(taperLength*sampleRate)),(len - i)/(taperLength*sampleRate));
      array[i] = amplitude * Math.sin(phase);
    }
  }
 
  static clearCanvas(canvas) {
    let ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.beginPath();
  }

  //start, end are floats between 0 and 1, and go UP
  static drawLine(canvas, contour, redLine) {
    IdealAudioNode.clearCanvas(canvas);
    let ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(0,(1-contour[0])*canvas.height);
    ctx.lineTo(canvas.width, (1-contour[1])*canvas.height);
    ctx.strokeStyle = 'black';
    ctx.stroke();
    if(!(redLine == null)) {
      ctx.beginPath();
      ctx.moveTo(0,(1-redLine)*canvas.height);
      ctx.lineTo(canvas.width, (1-redLine)*canvas.height);
      ctx.strokeStyle = 'red';
      ctx.stroke();
    }
  }
}
