var DELIMITER = ';'
var storedSemitone;
var spokenSentences;
var calibratedField;

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

function initializeCalibration(field) {
  calibratedField = field;

  storedSemitone = localStorage.getItem('stored_semitone');
  spokenSentences = readSpokenSentences();
  
  updateCalibration(storedSemitone)
}

function readSpokenSentences() {
  var stored = localStorage.getItem('spoken_sentences');
  var spokenSentences = [];
  if(stored == null) {
  } else {
    for(var sent in stored.split(DELIMITER)) {
      if(sent in harvardSentences.keys()) spokenSentences.push(sent);
    }
  }
 return spokenSentences;
}

function writeSpokenSentences(sentences) {
  console.log(sentences.join(DELIMITER))//TODO change to write to storage
}

function updateCalibration(value) {
  calibratedField.innerHTML = value == null? 'null': value;
}

// do means in st space
