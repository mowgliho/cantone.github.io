var MINF0 = 49 + 12*Math.log2(75/440);//Boermsa 1993
var MAXF0 = 49 + 12*Math.log2(500/440);
var MAXCALIBRATIONTIME = 5000;
var MEASUREMENTINTERVAL = 10;
var DELIMITER = ';'
var storedSemitone;
var calibratedField;
var calibrationWindow;
var calibratonSentence;
var calibrating = false;
var calibrationTimeout = null;
var calibrationTask = null;
var freqData = null;
var visibleSentence = null;

var harvardSentences = {
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

function initializeCalibration(field, calibWindow, calibSentence) {
  calibratedField = field;
  calibrationWindow = calibWindow;
  calibrationSentence = calibSentence;

  updateCalibration();
}

function readSpokenSentences() {
  var stored = localStorage.getItem('sent');
  var spokenSentences = [];
  if(stored == null) {
  } else {
    for(const sent of stored.split(DELIMITER)) {
      if(sent in harvardSentences) spokenSentences.push(sent);
    }
  }
 return spokenSentences;
}

function getNextSentence() {
  let spokenSentences = readCache()['sent']
  for(const [key,value] of Object.entries(harvardSentences).sort((a,b) => a[0].localeCompare(b[0]))) {
    if(!(spokenSentences.includes(key))) {
      return [key,value];
    }
  }
  return null;
}

function readCache() {
  return {
    mean: parseFloat(localStorage.getItem('mean')),
    sd: parseFloat(localStorage.getItem('sd')),
    n: parseInt(localStorage.getItem('n')),
    sent: readSpokenSentences()
  }
}

function writeCache(data) {
  for(var [key,value] of Object.entries(data)) {
    if(key == 'sent') {
      value = value.join(DELIMITER)
    }
    localStorage.setItem(key, value)
  }
}

function updateCalibration() {
  let cache = readCache()
  calibratedField.innerHTML = (isNaN(cache['mean'])? 'NaN': cache['mean']) + ' on ' + cache['sent'].length + ' sentences.';
  sentence = getNextSentence();
  if(sentence == null) {
    calibrationWindow.style.visibility = 'hidden';
  } else {
    visibleSentence = sentence[0]
    calibrationSentence.innerHTML = sentence[1];
  }
}

function loadCalibrationWindow() {
  calibrationWindow.style.visibility = 'visible';
  updateCalibration();
}

function refreshCalibration() {
  for(const [key,value] of Object.entries(readCache())) {
    localStorage.removeItem(key);
  }
  updateCalibration();
}

function startCalibration(audioContext, stream) {
  if(calibrating) return;
  calibrating = true;

  var analyzer = audioContext.createAnalyser();
  analyzer.fftsize = Math.pow(2,13);
  audioContext.createMediaStreamSource(stream).connect(analyzer)
  sampleRate = audioContext.sampleRate;
  data = new Float32Array(analyzer.fftSize)

  let idx = 0;
  freqData = new Array(Math.ceil(MAXCALIBRATIONTIME/MEASUREMENTINTERVAL));
  calcF0 = function() {
    analyzer.getFloatTimeDomainData(data);
    freqData[idx] = 49 + 12*Math.log2(yin(data, sampleRate)/440);
    idx ++;
  }

  calibrationTask = setInterval(calcF0, MEASUREMENTINTERVAL)
  calibrationTimeout = setTimeout(stopCalibration, MAXCALIBRATIONTIME)
}

function stopCalibration() {
  if(!calibrating) return;
  calibrating = false;
  clearTimeout(calibrationTimeout);
  clearTimeout(calibrationTask);

  //analyze frequency data
  const f0 = freqData.filter(val => val > MINF0 && val < MAXF0)
  if(f0.length > 0) {
    let data = readCache();
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
    data['sent'].push(visibleSentence)
    writeCache(data);
    updateCalibration();
  }
}
