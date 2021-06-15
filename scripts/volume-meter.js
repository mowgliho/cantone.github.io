function initializeAudioMeter(audioContext, mediaStreamSource) {
	var processor = audioContext.createScriptProcessor(512);
	processor.onaudioprocess = volumeAudioProcess;
	processor.volume = 0;
  processor.averaging = 0.95

	// this will have no effect, since we don't copy the input to the output,
	// but works around a current Chrome bug.
	processor.connect(audioContext.destination);

	processor.shutdown =
		function(){
			this.disconnect();
			this.onaudioprocess = null;
		};

  mediaStreamSource.connect(processor)
	return processor;
}

function volumeAudioProcess( event ) {
	let buf = event.inputBuffer.getChannelData(0);
  let bufLength = buf.length;
	let sum = 0;
  let x;

  for (var i=0; i<bufLength; i++) {
  	x = buf[i];
  	sum += x * x;
  }
  let rms =  Math.sqrt(sum / bufLength);

  this.volume = Math.max(rms, this.volume*this.averaging);
}

function meterLoop(startTime, volumeText, audioContext, mediaStreamSource, meterCanvas, meterCanvasContext, duration) {
    meter = initializeAudioMeter(audioContext, mediaStreamSource);
    // clear the background
    let width = meterCanvas.width
    let height = meterCanvas.height
    meterCanvasContext.clearRect(0,0,width,height);

    // draw a bar based on the current volume
    meterCanvasContext.beginPath()
    meterCanvasContext.moveTo(0,height)

    var drawInner = function() {
      // display volume as text
      volumeText.innerHTML = meter.volume;
      curTime = new Date().getTime() - startTime
      x = width*curTime/duration
      y = height*(1-meter.volume*5)
      meterCanvasContext.lineTo(x,y)
      meterCanvasContext.stroke()
      // set up the next visual callback
      if(curTime < duration) {
        window.requestAnimationFrame( drawInner );
      }
    }
    drawInner();
}
