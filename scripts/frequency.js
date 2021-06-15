function initializeFrequency(audioContext, mediaStreamSource) {
  var analyzer = audioContext.createAnalyser();
  analyzer.fftsize = Math.pow(2,13);
  mediaStreamSource.connect(analyzer);
  return analyzer;
}

function frequencyLoop(frequencyText, frequencyCanvas, audioContext, mediaStreamSource, startTime, duration) {
  min_f0 = 0
  max_f0 = 250

  analyzer = initializeFrequency(audioContext, mediaStreamSource);
  sampleRate = audioContext.sampleRate;
  data = new Float32Array(analyzer.fftSize)

  let frequencyContext = frequencyCanvas.getContext('2d')
  let width = frequencyCanvas.width
  let height = frequencyCanvas.height
  frequencyContext.clearRect(0,0,width,height);
   // draw a bar based on the current volume
  frequencyContext.beginPath()
  frequencyContext.moveTo(0,height)

 
  let drawInner = function() {
    let curTime = new Date().getTime() - startTime;
    analyzer.getFloatTimeDomainData(data)
    let frequency = yin(data, sampleRate)

    //fill in text box
    frequencyText.innerHTML = frequency;

    //plot on thingie
    x = width*curTime/duration
    y = height*(1-(frequency-min_f0)/(max_f0-min_f0))
    frequencyContext.lineTo(x,y)
    frequencyContext.stroke()

    if(curTime < duration) {
      window.requestAnimationFrame(drawInner);
    }
  }
  drawInner();
}
