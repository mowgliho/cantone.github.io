var DELIMITER = ';'
var storedSemitone;
var spokenSentences;
var calibratedField;
var calibrationWindow;
var calibratonSentence;

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

function getNextSentence(spokenSentences) {
  for(const [key,value] of Object.entries(harvardSentences).sort((a,b) => a[0].localeCompare(b[0]))) {
    if(!(key in spokenSentences)) {
      return [key,value];
    }
  }
}

function writeSpokenSentences(sentences) {
  console.log(sentences.join(DELIMITER));//TODO change to write to storage
}

function updateCalibration() {
  storedSemitone = localStorage.getItem('stored_semitone');
  spokenSentences = readSpokenSentences();
  calibratedField.innerHTML = (storedSemitone == null? 'null': storedSemitone) + ' on ' + spokenSentences.length + ' sentences.';
}

function loadCalibrationWindow() {
  sentence = getNextSentence(spokenSentences);
  calibrationWindow.style.visibility = 'visible';
  calibrationSentence.innerHTML = sentence[1];
}

function refreshCalibration() {
  localStorage.removeItem('spoken_sentences');
  localStorage.removeItem('stored_semitone');
  updateCalibration();
}
// on parsing calibration data, make invisible and update stuff?
// button to clear calibration
// do means in st space
