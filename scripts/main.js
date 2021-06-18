let audioContext = null;
let DURATION = 5000;
let meter = null;
let meterCanvas = null;
let meterCanvasContext = null;
let spectrogramCanvas = null;
let spectrogramCanvasContext = null;
let frequencyText = null;
let analyzer = null;
let start = null
let startTime = null;
let stream = null;

window.onload = function() {
  //cache initialization
  let cache = new Cache();

  //calibration initialization
  let calibrator = new Calibrator(document, startAudio, cache);

  //production initialization
  let producer = new Producer(document, startAudio, cache);

  //mode switcher
  initializeModeSwitcher(document, calibrator, producer);

  // grab our meter canvas
  meterCanvas = document.getElementById('meter');
  meterCanvasContext = meterCanvas.getContext("2d");
  volumeText = document.getElementById("volume-text");

  // grab spectrogram canvas
  spectrogramCanvas = document.getElementById("spectrogram");
  spectrogramCanvasContext = spectrogramCanvas.getContext("2d");

  // grab frequency field
  frequencyText = document.getElementById('frequency-text');
  frequencyCanvas = document.getElementById('frequency');

  // monkeypatch Web Audio
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  // grab an audio context
  document.getElementById('start-graphs').onclick = startAudio(createGraphs);

  //TODO remove: debugging code
//  document.getElementById('mode-produce').onclick()
}

function startAudio(f) {
  return function() {
    if(stream == null) {
      try {
          // monkeypatch getUserMedia
          // ask for an audio input
          audioContext = new AudioContext();
          let constraints = {
            audio: {
              autoGainControl: false,
              channelCount: 2,
              echoCancellation: false,
              latency: 0,
              noiseSuppression: false,
              sampleRate: 48000,
              sampleSize: 16,
              volume: 1.0
            }
          };
          navigator.mediaDevices.getUserMedia(constraints).then(function(s) { stream = s; f(audioContext, stream);}).catch(didntGetStream);
      } catch (e) {
          alert('getUserMedia threw exception :' + e);
      }
    } else {
      f(audioContext, stream);
    }
  }
}


function didntGetStream() {
    alert('Stream generation failed.');
}

var mediaStreamSource = null;

function createGraphs(audioContext, stream) {
    // Create an AudioNode from the stream.
    mediaStreamSource = audioContext.createMediaStreamSource(stream);
 
    startTime = new Date().getTime();

    // kick off the visual updating
    meterLoop(startTime, volumeText, audioContext, mediaStreamSource, meterCanvas, meterCanvasContext, DURATION);
    spectrogramLoop(spectrogramCanvas, spectrogramCanvasContext, audioContext, mediaStreamSource, startTime, DURATION);
    frequencyLoop(frequencyText, frequencyCanvas, audioContext, mediaStreamSource, startTime, DURATION);
}
