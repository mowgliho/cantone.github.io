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
  self
  field;
  window;
  sentence;

  //calibration variables
  calibrating = false;
  timeout = null;
  task = null;
  freqData = null;
  visibleSentence = null;

  //constructor
  constructor(document, startAudio) {
    self = this;
    self.field = document.getElementById('calibrated-value');
    self.window = document.getElementById('calibration-window');
    self.sentence = document.getElementById('next-calibration-sentence');

    document.getElementById('calibrate').onclick = self.loadCalibrationWindow;
    document.getElementById('refresh-calibration').onclick = self.refresh;
    document.getElementById('stop-calibration').onclick = self.stop;
    document.getElementById('start-calibration').onclick = startAudio(function(audioContext, stream) { self.start(audioContext,stream);});
 
    self.update();
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

  getNextSentence() {
    let spokenSentences = self.readCache()['sent']
    for(const [key,value] of Object.entries(self.HARVARDSENTENCES).sort((a,b) => a[0].localeCompare(b[0]))) {
      if(!(spokenSentences.includes(key))) {
        return [key,value];
      }
    }
    return null;
  }


  //GUI stuff
  update() {
    let cache = self.readCache()
    self.field.innerHTML = (isNaN(cache['mean'])? 'NaN': cache['mean']) + ' on ' + cache['sent'].length + ' sentences.';
    let sentence = self.getNextSentence();
    if(sentence == null) {
      self.window.style.visibility = 'hidden';
    } else {
      self.visibleSentence = sentence[0]
      self.sentence.innerHTML = sentence[1];
    }
  }

  loadCalibrationWindow() {
    self.window.style.visibility = 'visible';
    self.update();
  }

  refresh() {
    self.clearCache();
    self.update();
  }

  //Calibration code
  start(audioContext, stream) {
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
    self.timeout = setTimeout(self.stop, self.MAXCALIBRATIONTIME)
  }

  stop() {
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
      data['sent'].push(self.visibleSentence)
      self.writeCache(data);
      self.update();
    }
  }
}
