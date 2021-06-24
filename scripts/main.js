let audioContext = null;
let stream = null;

window.onload = function() {
  //cache initialization
  let cache = new Cache();

  //calibration initialization
  let calibrator = new Calibrator(document, startAudio, cache);

  //production initialization
  let producer = new Producer(document, startAudio, cache);
  let listener = new Listener(document, startAudio);

  //mode switcher
  initializeModeSwitcher(document, calibrator, producer, listener);

  // monkeypatch Web Audio
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
}

//takes as input a function f and returns a function that asks audio and then feeds the obtained audio stuff into f
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
              sampleRate: 16000,
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


function didntGetStream(err) {
    console.log('error' + err + err.stack);
    alert('Stream generation failed.' + err.stack);
}
