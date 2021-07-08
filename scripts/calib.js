class Calibrator {
  //class variables
  MINVOL = Math.pow(0.5,3)//don't want to be too loud
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
  calibrationType;
  timeout = null;
  task = null;
  store = null;

  //constructor
  constructor(document, startAudio, cache) {
    this.cache = cache;
    const summaryDiv = document.getElementById('div-calib-summary');
    this.volLabel = document.createElement('label');
    this.volLabel.style.display = 'block';
    this.meanLabel = document.createElement('mean');
    this.meanLabel.style.display = 'block';
    summaryDiv.appendChild(this.volLabel);
    summaryDiv.appendChild(this.meanLabel);
    
    this.initializeSentences(document, startAudio);
    document.getElementById('refresh-calibration').onclick = this.refresh;
 
    this.update();
  }

  activate() {
    this.update();
  }

  buildSentence(parentDiv, sentenceData, document, startAudio, key, value, type) {
    const that = this;
    const typ = type;

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
      that.start(audioContext, stream, key, typ);
    });
    stopButton.onclick = function() { that.stop(key);};
    //create text
    let p = document.createElement('div');
    p.style = 'display:inline-block;';
    p.innerHTML = '&nbsp' + value
    div.appendChild(p);
    parentDiv.appendChild(div);
    this.sentenceData[key] = {div:div, recordButton:recordButton, stopButton: stopButton};
  }

  initializeSentences = (document, startAudio) => {
    let parentDiv = document.getElementById('div-calib-sentences');
    this.sentenceData = {};
    for(const [type, sentences] of Object.entries(this.cache.getSentences())) {
      for(const [key, value] of Object.entries(sentences).sort((a,b) => a[0].localeCompare(b[0]))) {
        this.buildSentence(parentDiv, this.sentenceData, document, startAudio, key, value, type);
      }
    }
  }

  //GUI stuff
  update = () => {
    let cached = this.cache.readCache()
    if(cached['sent']['vol'].length == 0) {
      this.volLabel.innerHTML = 'You haven\'t calibrated volume yet. ';
      this.volLabel.style.color = 'red';
    } else {
      if(cached['silence'] < this.MINVOL) {
        this.volLabel.innerHTML = 'You\'ve calibrated volume to ' + cached['silence'].toFixed(2) + '.';
        if(cached['silence'] > 0) this.volLabel.innerHTML += ' In decibels this is ' + Math.log2(cached['silence']).toFixed(2) + '.';
        this.volLabel.style.color = 'black';
      } else {
        this.volLabel.innerHTML = 'Too much ambient noise. Please find a quieter place.';
        this.volLabel.style.color = 'blue';
      }
    }
    if(cached['sent']['freq'].length == 0) {
      this.meanLabel.innerHTML = 'You haven\'t recorded any frequency calibration sentences yet.';
      this.meanLabel.style.color = 'red';
    } else {
      this.meanLabel.innerHTML = 'You\'ve recorded ' + cached['sent']['freq'].length + ' frequency sentence' + (cached['sent']['freq'].length > 1?'s':'') + ', with a mean of ' + cached['mean'].toFixed(2) + ' and standard deviation of ' + cached['sd'].toFixed(2) + ' semitones.';
      this.meanLabel.style.color = 'black';
    }
    for(const [type,sentences] of Object.entries(this.cache.getSentences())) {
      for(const key of Object.keys(sentences)) {
        if(cached['sent']['freq'].includes(key) || cached['sent']['vol'].includes(key)) {
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
  }

  refresh = () => {
    this.cache.clearCache();
    this.update();
  }

  //Calibration code
  start = (audioContext, stream, sentence, calibrationType) => {
    if(this.calibrating) return;
    this.calibrating = true;
    this.calibrationType = calibrationType;
    let analyzer = audioContext.createAnalyser();
    analyzer.fftsize = Math.pow(2,9);
    audioContext.createMediaStreamSource(stream).connect(analyzer)
    let sampleRate = audioContext.sampleRate;
    let data = new Float32Array(analyzer.fftSize)

    let idx = 0;
    let that = this;

    this.store = new Array(Math.ceil(this.MAXCALIBRATIONTIME/this.MEASUREMENTINTERVAL));
    const innerFn = calibrationType == 'vol'?
      function(data) {return((Math.sqrt(data.reduce((a, x) => a + x**2)/data.length)));}:
      function(data) {return(49 + 12*Math.log2(yin(data, sampleRate)/440));};

    let calc = function() {
      analyzer.getFloatTimeDomainData(data);
      that.store[idx] = innerFn(data);
      idx ++;
    }

    this.task = setInterval(calc, this.MEASUREMENTINTERVAL)
    this.timeout = setTimeout(function() {that.stop(sentence);}, that.MAXCALIBRATIONTIME)
  }

  stop = (sentence) => {
    if(!this.calibrating) return;
    this.calibrating = false;
    clearTimeout(this.timeout);
    clearTimeout(this.task);

    let data = this.cache.readCache();
    if(this.calibrationType == 'freq') {
      //analyze frequency data
      const f0 = this.store.filter(val => val > this.MINF0 && val < this.MAXF0)
      if(f0.length > 0) {
        if(isNaN(data['n']) || data['n'] == 0) {
          data['mean'] = 0;
          data['sd'] = 0;
          data['n'] = 0;
        }
        let variance = (data['sd']*data['sd'])*data['n']
        for(const val of f0) {
          let n = data['n'];
          let old_mean = data['mean'];
          data['mean'] = data['mean']*(n/(n + 1)) + val/(n + 1)
          //https://datagenetics.com/blog/november22017/index.html
          variance = variance + (val - old_mean)*(val - data['mean'])
          data['n'] = n + 1;
        }
        data['sd'] = Math.sqrt(variance/data['n'])
        data['sent']['freq'].push(sentence)
      }
    } else if(this.calibrationType == 'vol') {
      this.store.sort((a,b) => a-b)
      const idx = this.store.length % 2 == 0? this.store.length/2 - 1: Math.floor(this.store.length/2);
      const vol = this.store[idx]
      data['sent']['vol'].push(sentence);
      data['silence'] = vol;
    }
    this.cache.writeCache(data);
    this.update();
  }
}
