function initializeFrequency(audioContext, mediaStreamSource) {
  var analyzer = audioContext.createAnalyser();
  analyzer.fftsize = Math.pow(2,13);
  mediaStreamSource.connect(analyzer);
  return analyzer;
}

function frequencyLoop(frequencyText, audioContext, mediaStreamSource, startTime, duration) {
  analyzer = initializeFrequency(audioContext, mediaStreamSource);
  sampleRate = audioContext.sampleRate;
  data = new Float32Array(analyzer.fftSize)
  
  let drawInner = function() {
    let curTime = new Date().getTime() - startTime;
    analyzer.getFloatTimeDomainData(data)
    let frequency = yin(data, sampleRate)
    console.log(frequency)
    frequencyText.innerHTML = frequency;
    if(curTime < duration) {
      window.requestAnimationFrame(drawInner);
    }
  }
  drawInner();
}
