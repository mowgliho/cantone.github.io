function initializeSpectrogram(audioContext, mediaStreamSource) {
  var analyzer = audioContext.createAnalyser();
  analyzer.minDecibels = -90;
  analyzer.maxDecibels = -10;
  analyzer.smoothingTimeConstant = 0.85;
  analyzer.fftSize = 256;
  mediaStreamSource.connect(analyzer);
  return analyzer;
}

function spectrogramLoop(spectrogramCanvas, spectrogramCanvasContext, audioContext, mediaStreamSource, startTime, duration) {
  analyzer = initializeSpectrogram(audioContext, mediaStreamSource);
  let width = spectrogramCanvas.width;
  let height = spectrogramCanvas.height;

  let bufferLengthAlt = analyzer.frequencyBinCount;
  let dataArrayAlt = new Uint8Array(bufferLengthAlt);


  let drawInner = function() {
    analyzer.getByteFrequencyData(dataArrayAlt);

    spectrogramCanvasContext.fillStyle = 'rgb(0, 255, 0)';

    let barWidth = (width / bufferLengthAlt) * 2.5;
    let barHeight;
    let x = 0;
    spectrogramCanvasContext.clearRect(0, 0, width, height);
    spectrogramCanvasContext.beginPath();
    for(var i = 0; i < bufferLengthAlt; i++) {
      barHeight = dataArrayAlt[i];
      y = height - barHeight/2;
      if (i == 0) spectrogramCanvasContext.moveTo(x,y);
      else {
        spectrogramCanvasContext.lineTo(x,y)
        spectrogramCanvasContext.stroke()
      }
      x += barWidth + 1;
    }
    if(new Date().getTime() - startTime < duration) {
      window.requestAnimationFrame(drawInner);
    }
  };
  drawInner();
}
