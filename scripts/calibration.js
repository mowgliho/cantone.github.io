var MINF0 = 75;
var MAXF0 = 500;
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
  var stored = localStorage.getItem('spoken_sentences');
  var spokenSentences = [];
  if(stored == null) {
  } else {
    for(const sent of stored.split(DELIMITER)) {
      if(sent in harvardSentences.keys()) spokenSentences.push(sent);
    }
  }
 return spokenSentences;
}

function getNextSentence() {
  let spokenSentences = readCache()['sent']
  for(const [key,value] of Object.entries(harvardSentences).sort((a,b) => a[0].localeCompare(b[0]))) {
    if(!(key in spokenSentences)) {
      return [key,value];
    }
  }
}

function writeSpokenSentences(sentences) {
  console.log(sentences.join(DELIMITER));//TODO change to write to storage
}

function readCache() {
  return {
    mean: localStorage.getItem('semitone_mean'),
    sd: localStorage.getItem('semitone_sd'),
    n: localStorage.getItem('semitone_n'),
    sent: readSpokenSentences()
  }
}

function writeCache(data) {
  for(const [key,value] of Object.entries(data)) {
    localStorage.setItem(key, value)
  }
}

function updateCalibration() {
  let cache = readCache()
  calibratedField.innerHTML = (cache['mean'] == null? 'null': cache['mean']) + ' on ' + cache['sent'].length + ' sentences.';
}

function loadCalibrationWindow() {
  sentence = getNextSentence();
  calibrationWindow.style.visibility = 'visible';
  calibrationSentence.innerHTML = sentence[1];
}

function refreshCalibration() {
  for(const [key,value] of Object.entries(readCache())) {
    localStorage.removeItem(key);
  }
  updateCalibration();
}

function startCalibration(audioContext, stream) {
  if(calibrating) return;
  console.log('started')
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
    freqData[idx] = yin(data, sampleRate);
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
  console.log('ended');

  //analyze frequency data
  console.log(freqData);
  const f0 = freqData.filter(val => val > MINF0 && val < MAXF0)
  console.log(f0)
}

// on parsing calibration data, make invisible and update stuff?
// button to clear calibration
// do means in st space
