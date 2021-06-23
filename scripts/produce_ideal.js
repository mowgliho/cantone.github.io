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
      const plotType = x == 'main'? 'trace':'line';
      const button = document.getElementById("produce-ideal-" + x + "-button")
      const contourFn = x == 'start'? function(c) { return([c[0],c[0]])}: 
        x == 'main'? function(c) { return([c[0],c[1]])}:
        function(c) {return([c[1],c[1]])};
      that.nodes[x] = new IdealAudioNode(contourFn, canvas, plotType, button, startAudio);
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

  task;
  timeout;
  recording;

  constructor(contourFn, canvas, plotType, button, startAudio) {
    const that = this;
    this.recording = false;
    this.contourFn = contourFn;
    this.contour = null;
    this.canvas = canvas;
    this.plotType = plotType;
    this.button = button;
    this.button.onclick = startAudio(
      function(audioContext,stream) {
        that.startRecording(audioContext, stream);
      }
    );
  }
  
  update(tone, mean, sd) {
    this.tone = tone;
    this.mean = mean;
    this.sd = sd;
    if(Object.keys(IdealAudioNode.idealTones).includes(this.tone)) {
      const rawContour = this.contourFn(IdealAudioNode.idealTones[tone]);
      this.contour = [rawContour[0]/IdealAudioNode.height + 0.5, rawContour[1]/IdealAudioNode.height + 0.5];
      IdealAudioNode.drawLine(this.canvas, this.contour, null);
    } else {
      IdealAudioNode.clearCanvas(this.canvas);
    }
  }

  //type is either 'line' or 'trace'
  startRecording = (audioContext, stream) => {
    console.log('start');
    if(this.recording) return;
    this.recording = true;

    let that = this;

    let analyzer = audioContext.createAnalyser();
    analyzer.fftsize = Math.pow(2,9);
    audioContext.createMediaStreamSource(stream).connect(analyzer)
    let sampleRate = audioContext.sampleRate;
    let data = new Float32Array(analyzer.fftSize)

    let intervalFn;
    if(this.plotType == 'line') intervalFn = this.getLineFn(that, analyzer, data, sampleRate);
    else if(this.plotType == 'trace') intervalFn = this.getTraceFn(that, analyzer, data, sampleRate, new Date().getTime() );

    this.task = setInterval(intervalFn, IdealAudioNode.measurementInterval)

    this.timeout = setTimeout(function() {that.stopRecording();}, IdealAudioNode.idealTime)
  }

  stopRecording = () => {
    console.log('stop');
    if(!this.recording) return;
    this.recording = false;
    clearTimeout(this.task)
    clearTimeout(this.timeout)
  }

  getLineFn(that, analyzer, data, sampleRate) {
    return function() {
      analyzer.getFloatTimeDomainData(data);
      let st = 49 + 12*Math.log2(yin(data, sampleRate)/440);
      let sd = 4;//TODO get standard deviation defined non-statically
      let redLine = Math.max(0, Math.min(1, 0.5 + (st-that.mean)/sd))
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
      let sd = 4;//TODO get standard deviation defined non-statically
      let y = (1 - Math.max(0, Math.min(1, 0.5 + (st-that.mean)/sd))) * that.canvas.height
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
  //returns start and end point of ideal tone w.r.t Chao tones in semitone space, in units of sd from mean.
  static measurementInterval = 10;
  static idealTime = 5000;//TODO make larger, turn off if get close enough in range, changeable for main
  static idealTones = {
    t1: [2,2],
    t2: [-1,2],
    t3: [0,0],
    t4: [-1,-2],
    t5: [-1,0],
    t6: [-1,-1]
  };

 static height = 6;//number of sds tall the canvas is, with 0/mean in the middle.
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

