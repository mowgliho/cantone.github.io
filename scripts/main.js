let audioContext = null;
let DURATION = 5000
let meter = null;
let meterCanvas = null;
let meterCanvasContext = null;
let spectrogramCanvas = null;
let spectrogramCanvasContext = null;
let analyzer = null;
let start = null
let startTime = null;

window.onload = function() {
  // grab our meter canvas
  meterCanvas = document.getElementById('meter')
  meterCanvasContext = meterCanvas.getContext("2d");
  volumeText = document.getElementById("volume-text");

  // grab spectrogram canvas
  spectrogramCanvas = document.getElementById("spectrogram");
  spectrogramCanvasContext = spectrogramCanvas.getContext("2d");

  // monkeypatch Web Audio
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  // grab an audio context
  start = document.getElementById('start')
  start.onclick = startAudio;
}

function startAudio() {
  // Attempt to get audio input
  try {
      // monkeypatch getUserMedia
      // ask for an audio input
      audioContext = new AudioContext();
      let constraints = {
          "audio": {
              "mandatory": {
                  "googEchoCancellation": "false",
                  "googAutoGainControl": "false",
                  "googNoiseSuppression": "false",
                  "googHighpassFilter": "false"
              },
              "optional": []
          },
      };
      navigator.mediaDevices.getUserMedia(constraints).then(gotStream).catch(didntGetStream);
  } catch (e) {
      alert('getUserMedia threw exception :' + e);
  }
}


function didntGetStream() {
    alert('Stream generation failed.');
}

var mediaStreamSource = null;

function gotStream(stream) {
    // Create an AudioNode from the stream.
    mediaStreamSource = audioContext.createMediaStreamSource(stream);
    // Create a new volume meter and connect it.
    meter = createAudioMeter(audioContext);
    analyzer = createAnalyzer(audioContext);
 
    mediaStreamSource.connect(meter);
    mediaStreamSource.connect(analyzer);
    startTime = new Date().getTime();
    // kick off the visual updating
    meterLoop(startTime, volumeText, meter, meterCanvas, meterCanvasContext, DURATION)
    spectrogramLoop(spectrogramCanvas, spectrogramCanvasContext, analyzer, startTime, DURATION)
}


