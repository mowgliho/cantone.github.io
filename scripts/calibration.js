class Calibrator {
  //class variables
  MINF0 = 49 + 12*Math.log2(75/440);//Boermsa 1993
  MAXF0 = 49 + 12*Math.log2(500/440);
  MAXCALIBRATIONTIME = 5000;
  MEASUREMENTINTERVAL = 10;
  DELIMITER = ';';
  HARVARDSENTENCES = {
    h0:'Stop whistling and watch the boys march.',
    h1:'Jerk the cord and out tumbles the gold.',
    h2:'Slide the tray across the glass top.',
    h3:'The cloud moved in a stately way and was gone.',
    h4:'Light maple makes for a swell room.',
    h5:'Set the piece here and say nothing.',
    h6:'Dull stories make her laugh.',
    h7:'A stiff cord will do to fasten your shoe.',
    h8:'Get the trust fund to the bank early.',
    h9:'Choose between the high road and the low.'
  };

  //to be set by constructor
  self;
  summary;
  sentenceData;

  //calibration variables
  calibrating = false;
  timeout = null;
  task = null;
  freqData = null;

  //constructor
  constructor(document, startAudio) {
    self = this;

    self.summary = document.getElementById('calib-summary-text');
    self.initializeSentences(document, startAudio);
    document.getElementById('refresh-calibration').onclick = self.refresh;
 
    self.update();
  }

  initializeSentences(document, startAudio) {
    let html = document.getElementById('div-calib-sentences');
    self.sentenceData = {};
    for(const [key,value] of Object.entries(self.HARVARDSENTENCES).sort((a,b) => a[0].localeCompare(b[0]))) {
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
        self.start(audioContext, stream, key);
      });
      stopButton.onclick = function() { self.stop(key);};
      //create text
      let p = document.createElement('div');
      p.style = 'display:inline-block;';
      p.innerHTML = '&nbsp' + value
      div.appendChild(p);
      html.appendChild(div);
      self.sentenceData[key] = {div:div, recordButton:recordButton, stopButton: stopButton};
    }
  }

  //cache stuff
  readCache() {
    return {
      mean: parseFloat(localStorage.getItem('mean')),
      sd: parseFloat(localStorage.getItem('sd')),
      n: parseInt(localStorage.getItem('n')),
      sent: self.readSpokenSentences()
    }
  }

  writeCache(data) {
    for(var [key,value] of Object.entries(data)) {
      if(key == 'sent') {
        value = value.join(self.DELIMITER)
      }
      localStorage.setItem(key, value)
    }
  }

  clearCache() {
    for(const [key,value] of Object.entries(self.readCache())) {
      localStorage.removeItem(key);
    }
  }

  readSpokenSentences() {
    var stored = localStorage.getItem('sent');
    var spokenSentences = [];
    if(stored == null) {
    } else {
      for(const sent of stored.split(self.DELIMITER)) {
        if(sent in self.HARVARDSENTENCES) spokenSentences.push(sent);
      }
    }
   return spokenSentences;
  }

  //GUI stuff
  update() {
    let cache = self.readCache()
    if(cache['sent'].length == 0) {
      self.summary.innerHTML = 'You haven\'t recorded any calibration sentences yet.';
    } else {
      self.summary.innerHTML = 'You\'ve recorded ' + cache['sent'].length + ' sentences, with a mean of ' + cache['mean'].toFixed(2) + ' and standard deviation of ' + cache['sd'].toFixed(2) + ' semitones.';
    }
    for(const [key,value] of Object.entries(self.HARVARDSENTENCES).sort((a,b) => a[0].localeCompare(b[0]))) {
      if(cache['sent'].includes(key)) {
        self.sentenceData[key]['div'].style = 'color:blue;'
        self.sentenceData[key]['recordButton'].style = 'visibility:hidden;';
        self.sentenceData[key]['stopButton'].style = 'visibility:hidden;color:red;';
      } else {
        self.sentenceData[key]['div'].style = '';
        self.sentenceData[key]['recordButton'].style = 'visibility:visible;';
        self.sentenceData[key]['stopButton'].style = 'visibility:hidden;color:red;';
      }
    }
  }

  refresh() {
    self.clearCache();
    self.update();
  }

  //Calibration code
  start(audioContext, stream, sentence) {
    if(self.calibrating) return;
    self.calibrating = true;

    let analyzer = audioContext.createAnalyser();
    analyzer.fftsize = Math.pow(2,9);
    audioContext.createMediaStreamSource(stream).connect(analyzer)
    let sampleRate = audioContext.sampleRate;
    let data = new Float32Array(analyzer.fftSize)

    let idx = 0;
    self.freqData = new Array(Math.ceil(self.MAXCALIBRATIONTIME/self.MEASUREMENTINTERVAL));
    let calcF0 = function() {
      analyzer.getFloatTimeDomainData(data);
      self.freqData[idx] = 49 + 12*Math.log2(yin(data, sampleRate)/440);
      idx ++;
    }

    self.task = setInterval(calcF0, self.MEASUREMENTINTERVAL)
    self.timeout = setTimeout(function() {self.stop(sentence);}, self.MAXCALIBRATIONTIME)
  }

  stop(sentence) {
    if(!self.calibrating) return;
    self.calibrating = false;
    clearTimeout(self.timeout);
    clearTimeout(self.task);

    //analyze frequency data
    const f0 = self.freqData.filter(val => val > self.MINF0 && val < self.MAXF0)
    if(f0.length > 0) {
      let data = self.readCache();
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
      self.writeCache(data);
    }
    self.update();
  }
}
