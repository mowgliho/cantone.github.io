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
  //calibration initialization
  initializeCalibration(
    document.getElementById('calibrated-value'), 
    document.getElementById('calibration-window'), 
    document.getElementById('next-calibration-sentence'));
  document.getElementById('calibrate').onclick = loadCalibrationWindow;
  document.getElementById('refresh-calibration').onclick = refreshCalibration;
  document.getElementById('start-calibration').onclick = startAudio(function(stream) { startCalibration(audioContext,stream);});
  document.getElementById('stop-calibration').onclick = stopCalibration;

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
          navigator.mediaDevices.getUserMedia(constraints).then(function(s) { stream = s; f(stream);}).catch(didntGetStream);
      } catch (e) {
          alert('getUserMedia threw exception :' + e);
      }
    } else {
      f(stream);
    }
  }
}


function didntGetStream() {
    alert('Stream generation failed.');
}

var mediaStreamSource = null;

function createGraphs(stream) {
    // Create an AudioNode from the stream.
    mediaStreamSource = audioContext.createMediaStreamSource(stream);
 
    startTime = new Date().getTime();

    // kick off the visual updating
    meterLoop(startTime, volumeText, audioContext, mediaStreamSource, meterCanvas, meterCanvasContext, DURATION);
    spectrogramLoop(spectrogramCanvas, spectrogramCanvasContext, audioContext, mediaStreamSource, startTime, DURATION);
    frequencyLoop(frequencyText, frequencyCanvas, audioContext, mediaStreamSource, startTime, DURATION);
}
