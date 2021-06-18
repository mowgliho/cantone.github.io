class Calibrator {
  //class variables
  MINF0 = 49 + 12*Math.log2(75/440);//Boermsa 1993
  MAXF0 = 49 + 12*Math.log2(500/440);
  MAXCALIBRATIONTIME = 5000;
  MEASUREMENTINTERVAL = 10;

  //to be set by constructor
  summary;
  sentenceData;
  cache;

  //calibration variables
  calibrating = false;
  timeout = null;
  task = null;
  freqData = null;

  //constructor
  constructor(document, startAudio, cache) {
    this.cache = cache;
    this.summary = document.getElementById('calib-summary-text');
    this.initializeSentences(this, document, startAudio);
    document.getElementById('refresh-calibration').onclick = this.refresh;
 
    this.update();
  }

  activate() {
    this.update();
  }

  initializeSentences = (that, document, startAudio) => {
    let html = document.getElementById('div-calib-sentences');
    this.sentenceData = {};
    for(const [key,value] of Object.entries(this.cache.getSentences()).sort((a,b) => a[0].localeCompare(b[0]))) {
      let div = document.createElement('div');
      //create button 
      let recordButton = document.createElement('button');
      recordButton.innerHTML = 'Record';
      let stopButton = document.createElement('button');
      stopButton.innerHTML = 'Stop';
      div.appendChild(recordButton);
      div.appendChild(stopButton);
      //onclicks
      recordButton.onclick = startAudio(function(audioContext, stream) { 
        recordButton.style = 'visibility:hidden;';
        stopButton.style = 'visibility:visible;color:red;';
        that.start(audioContext, stream, key);
      });
      stopButton.onclick = function() { that.stop(key);};
      //create text
      let p = document.createElement('div');
      p.style = 'display:inline-block;';
      p.innerHTML = '&nbsp' + value
      div.appendChild(p);
      html.appendChild(div);
      this.sentenceData[key] = {div:div, recordButton:recordButton, stopButton: stopButton};
    }
  }

  //GUI stuff
  update = () => {
    let cached = this.cache.readCache()
    if(cached['sent'].length == 0) {
      this.summary.innerHTML = 'You haven\'t recorded any calibration sentences yet.';
    } else {
      this.summary.innerHTML = 'You\'ve recorded ' + cached['sent'].length + ' sentences, with a mean of ' + cached['mean'].toFixed(2) + ' and standard deviation of ' + cached['sd'].toFixed(2) + ' semitones.';
    }
    for(const [key,value] of Object.entries(this.cache.getSentences()).sort((a,b) => a[0].localeCompare(b[0]))) {
      if(cached['sent'].includes(key)) {
        this.sentenceData[key]['div'].style = 'color:blue;'
        this.sentenceData[key]['recordButton'].style = 'visibility:hidden;';
        this.sentenceData[key]['stopButton'].style = 'visibility:hidden;color:red;';
      } else {
        this.sentenceData[key]['div'].style = '';
        this.sentenceData[key]['recordButton'].style = 'visibility:visible;';
        this.sentenceData[key]['stopButton'].style = 'visibility:hidden;color:red;';
      }
    }
  }

  refresh = () => {
    this.cache.clearCache();
    this.update();
  }

  //Calibration code
  start = (audioContext, stream, sentence) => {
    if(this.calibrating) return;
    this.calibrating = true;
    let analyzer = audioContext.createAnalyser();
    analyzer.fftsize = Math.pow(2,9);
    audioContext.createMediaStreamSource(stream).connect(analyzer)
    let sampleRate = audioContext.sampleRate;
    let data = new Float32Array(analyzer.fftSize)

    let idx = 0;
    this.freqData = new Array(Math.ceil(this.MAXCALIBRATIONTIME/this.MEASUREMENTINTERVAL));
    let that = this;
    let calcF0 = function() {
      analyzer.getFloatTimeDomainData(data);
      that.freqData[idx] = 49 + 12*Math.log2(yin(data, sampleRate)/440);
      idx ++;
    }

    this.task = setInterval(calcF0, this.MEASUREMENTINTERVAL)
    this.timeout = setTimeout(function() {that.stop(sentence);}, that.MAXCALIBRATIONTIME)
  }

  stop = (sentence) => {
    if(!this.calibrating) return;
    this.calibrating = false;
    clearTimeout(this.timeout);
    clearTimeout(this.task);

    //analyze frequency data
    const f0 = this.freqData.filter(val => val > this.MINF0 && val < this.MAXF0)
    if(f0.length > 0) {
      let data = this.cache.readCache();
      if(isNaN(data['n']) || data['n'] == 0) {
        data = {
          mean: 0,
          sd: 0,
          n: 0,
          sent: []
        }
      }
      let variance = (data['sd']*data['sd'])*data['n']
      for(const val of f0) {
        let n = data['n'];
        let old_mean = data['mean'];
        data['mean'] = data['mean']*(n/(n + 1)) + val/(n + 1)
        //https://datagenetics.com/blog/november22017/index.html
        variance = variance + (val - old_mean)*(val - data['mean'])
        data['n'] = n + 1
      }
      data['sd'] = Math.sqrt(variance/data['n'])
      data['sent'].push(sentence)
      this.cache.writeCache(data);
    }
    this.update();
  }
}
