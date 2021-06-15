function createAnalyzer(audioContext) {
  var analyzer = audioContext.createAnalyser();
  analyzer.minDecibels = -90;
  analyzer.maxDecibels = -10;
  analyzer.smoothingTimeConstant = 0.85;
  return analyzer;
}

function spectrogramLoop(spectrogramCanvas, spectrogramCanvasContext, analyzer, startTime, duration) {
  let width = spectrogramCanvas.width;
  let height = spectrogramCanvas.height;

  analyzer.fftSize = 256;
  let bufferLengthAlt = analyzer.frequencyBinCount;
  let dataArrayAlt = new Uint8Array(bufferLengthAlt);


  let drawAlt = function() {
    if(new Date().getTime() - startTime < duration) {
      drawVisual = window.requestAnimationFrame(drawAlt);
    }
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
  };
  drawAlt();
}
