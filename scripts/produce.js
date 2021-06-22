class Producer {
  //modes
  modes = [null,'ideal','data','ta'];
  tones = ['t1','t2','t3','t4','t5','t6'];
  updateFns;

  //divs
  calibrationDiv;
  trainDiv;

  cache;

  //state
  mode;

  //helper variables
  mean;
  sd;

  //for audio stuff
  time;
  timeout;
  task;
  recording;

  constructor(document, startAudio, cache) {
    this.calibrationDiv = document.getElementById("div-produce-calib");
    this.trainDiv = document.getElementById("div-produce-train");
    this.cache = cache;

    const that = this;
    this.mode = null;
    //connect up all modes to functionality
    for(const mode of this.modes) {
      if(!(mode == null)) this.initializeMode(that, mode, document, startAudio);
    }

    this.updateFns = {
      null: function() {}, 
      ideal: function() {that.updateIdeal(that);}, 
      data:function() {console.log(that.mode);}, 
      ta:function() {console.log(that.mode);}
    };
    this.update();
  }

  activate() {
    this.update();
  }

  //the all-important function
  update() {
    //show correct div
    for(const m of this.modes) {
      if(m == null) {
      } else if(m == this.mode) {
        document.getElementById('div-produce-' + m).style = 'display:block;';
      } else {
        document.getElementById('div-produce-' + m).style = 'display:none;';
      }
    }
    //read cache
    let cached = this.cache.readCache();
    //if no cache, turn off window
    if(cached['n'] == null || cached['sent'].length == null || cached['n'] == 0 || cached['sent'].length == 0) {
      this.calibrationDiv.innerHTML = "Haven't calibrated yet";
      this.trainDiv.style = "display:none;";
      this.calibrated = false;
    } else {//if cache, store cached values
      this.mean = cached['mean'];
      this.sd = cached['sd'];
      this.calibrationDiv.innerHTML = "Calibrated with mean of " + cached['mean'].toFixed(2) + ' and sd of ' + cached['sd'].toFixed(2) + '<br>';
      this.trainDiv.style = "display:block;";
      this.calibrated = true;
      this.updateFns[this.mode]();//update the rest of the GUI
    }
    this.recording = false;
  }

  initializeMode(that, mode, document, startAudio) {
    //mode buttons
    document.getElementById('produce-mode-' + mode).onclick = function() { that.mode = mode; that.update();};
    //tone selector for mode (all modes should have one)
    let selector = document.getElementById("produce-" + mode + "-tone");
    if(!(selector == null)) {
      for(const tone of ['None'].concat(this.tones)) {
        let opt = document.createElement('option');
        opt.value = tone;
        opt.innerHTML = tone;
        selector.appendChild(opt);
      }
      that.tone = selector.value;
      selector.onchange = function(val) { that.tone = selector.value; that.update();};
    }
    //mode specific setup
    if(mode == 'ideal') that.initializeIdeal(that, document, startAudio);
  }

  //functions and setup. All stuff with actual values will be with the update function
  initializeIdeal(that, document, startAudio) {
    that.idealAudioNodes = {}
    for(const x of ['start','main','end']) {
      const canvas = document.getElementById('produce-ideal-' + x + '-col');
      const plotType = x == 'main'? 'trace':'line';
      const button = document.getElementById("produce-ideal-" + x + "-button")
      const contourFn = x == 'start'? function(c) { return([c[0],c[0]])}: 
        x == 'main'? function(c) { return([c[0],c[1]])}:
        function(c) {return([c[1],c[1]])};
      that.idealAudioNodes[x] = new IdealAudioNode(contourFn, canvas, plotType, button, startAudio);
    }
  }

  updateIdeal(that) {
    const tone = (that.tones.includes(that.tone) && that.calibrated)? that.tone: null;
    for(const [key, node] of Object.entries(that.idealAudioNodes)) {
      node.update(tone, that.mean, that.sd);
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
    this.mean = mean;
    this.sd = sd;
    if(tone != null) {
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
      console.log(startTime)
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

