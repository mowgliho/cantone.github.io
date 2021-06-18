class Producer {
  MEASUREMENTINTERVAL = 10;
  idealTime = 5000;//TODO make larger, turn off if get close enough in range, changeable for main
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
    that.idealElements = {
      start: document.getElementById("produce-ideal-start-col"),
      main: document.getElementById("produce-ideal-main-col"),
      end: document.getElementById("produce-ideal-end-col")
    };
    for(const x of ['start','end']) {
      document.getElementById("produce-ideal-" + x + "-button").onclick = startAudio(function(audioContext,stream) {
        that.startRecording(audioContext, stream, that.idealElements[x], that.idealContours[x], 'line');
      });
    }
    document.getElementById("produce-ideal-main-button").onclick = startAudio(function(audioContext,stream) {
      that.startRecording(audioContext, stream, that.idealElements['main'], that.idealContours['main'], 'trace');
    });

  }

  //type is either 'line' or 'trace'
  startRecording = (audioContext, stream, canvas, contour, type) => {
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
    if(type == 'line') intervalFn = this.getLineFn(that, analyzer, data, sampleRate, canvas, contour);
    else if(type == 'trace') intervalFn = this.getTraceFn(that, analyzer, data, sampleRate, canvas, contour,new Date().getTime() );
    this.task = setInterval(intervalFn, this.MEASUREMENTINTERVAL)

    this.timeout = setTimeout(function() {that.stopRecording();}, this.idealTime)
  }

  getLineFn(that, analyzer, data, sampleRate, canvas, contour) {
    return function() {
      analyzer.getFloatTimeDomainData(data);
      let st = 49 + 12*Math.log2(yin(data, sampleRate)/440);
      let sd = 4;//TODO get standard deviation defined non-statically
      let redLine = Math.max(0, Math.min(1, 0.5 + (st-that.mean)/sd))
      Producer.drawLine(canvas, contour, redLine);
    }
  }

  getTraceFn(that, analyzer, data, sampleRate, canvas, contour, startTime) {
    Producer.drawLine(canvas, contour, null);
    let ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.strokeStyle = 'red';
    let cur = null;

    return function() {
      analyzer.getFloatTimeDomainData(data);
      let st = 49 + 12*Math.log2(yin(data, sampleRate)/440);
      let sd = 4;//TODO get standard deviation defined non-statically
      let y = (1 - Math.max(0, Math.min(1, 0.5 + (st-that.mean)/sd))) * canvas.height
      let x = ((new Date().getTime() - startTime)/that.idealTime) * canvas.width;
      if(cur == null) {
        ctx.moveTo(x,y);
      } else {
        ctx.lineTo(x,y);
        ctx.stroke();
      }
      cur = true
    }
  }
  stopRecording = () => {
    console.log('stop');
    if(!this.recording) return;
    this.recording = false;
    clearTimeout(this.task)
    clearTimeout(this.timeout)
  }


  //returns start and end point of ideal tone w.r.t Chao tones in semitone space, in units of sd from mean.
  static idealTones = {
    t1: [2,2],
    t2: [-1,2],
    t3: [0,0],
    t4: [-1,-2],
    t5: [-1,0],
    t6: [-1,-1]
  };
  static idealHeight = 6;//number of sds tall the canvas is, with 0/mean in the middle.

  //start, end are floats between 0 and 1, and go UP
  static drawLine(canvas, contour, redLine) {
    Producer.clearCanvas(canvas);
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

  static clearCanvas(canvas) {
    let ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.beginPath();
  }

  updateIdeal(that) {
    if(that.tones.includes(that.tone) && that.calibrated) {
      let contour = Producer.idealTones[that.tone];
      let frac = [contour[0]/Producer.idealHeight + 0.5, contour[1]/Producer.idealHeight + 0.5]
      that.idealContours = {
        start: [frac[0], frac[0]],
        main: [frac[0], frac[1]],
        end: [frac[1], frac[1]]
      }
      for(const [key, val] of Object.entries(that.idealElements)) {
        Producer.drawLine(val, that.idealContours[key], null);
      }
    } else {
      for(const [key, val] of Object.entries(that.idealElements)) {
        Producer.clearCanvas(val);
      }
    }
  }
}
