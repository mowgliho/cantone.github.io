//TODO replace setInterval with requestAnimationFrame
class ProduceTrainer {
  static smoothLength = 5;
  static smoothThreshold = 10;
  static silenceBuffer = 1;
  height = 20;//number of sts tall the canvas is, with 0/mean in the middle.
  static band = 0.05;
  canvasHeight = '500';
  tuneWidth = '100';
  tryWidth = '600';
  adjustedDuration = 0.7;
  tuneDuration = 8;
  guideToneDuration = 2;
  maxTryDuration = 3;
  measurementInterval = 25;
  static tryDBCutoff = Math.log2(0.01);
  tryDetectThreshold = 10;
  canvases;
  static playColor = 'LawnGreen';
  static stoppedColor = '';
  tryMargin = 100;

  audioProducer = ChaoAudioProducer;
  div;

  //stuff that changes
  mean;
  sd;
  char;
  tone;
  timeouts;

  //state
  playState;

  constructor(document, parentDiv, startAudio) {
    this.div = document.createElement('div');
    this.buildButtons(document, this.div, startAudio);
    const graphDiv = document.createElement('div');
    this.buildTuners(document, graphDiv, startAudio);
    this.buildTry(document, graphDiv, startAudio);

    //finish up
    this.div.appendChild(graphDiv);
    parentDiv.appendChild(this.div);
    this.timeouts = [];
    this.playState = 'none'
  }

  buildTry(document, graphDiv, startAudio) {
    const that = this;

    const div = document.createElement('div');
    div.style.display = 'inline-block';
    div.style.border = '1px solid';
    div.style.width = this.tryWidth + 'px';
    this.tryCanvas = document.createElement('canvas');
    this.tryCanvas.height = this.canvasHeight;
    this.tryCanvas.width = this.tryWidth;
    div.appendChild(this.tryCanvas);
    const tryButton = document.createElement('button');
    tryButton.style.width = '100%';
    tryButton.innerHTML = 'Try It!';
    tryButton.onclick = startAudio(function(audioContext,stream) {that.try(audioContext,stream,tryButton,that.tryCanvas)});
    div.appendChild(tryButton);
    const listenButton = document.createElement('button');
    listenButton.style.width = '100%';
    listenButton.innerHTML = 'Listen to Adjusted Reference';
    div.appendChild(listenButton);
    listenButton.onclick = startAudio(function(audioContext, stream) { that.playAdjusted(audioContext, listenButton, 1);});
    graphDiv.appendChild(div);
  }

  buildTuners(document, graphDiv, startAudio) {
    const that = this;

    this.canvases = {};
    for(const type of ['start','end']) {
      const div = document.createElement('div');
      div.style.display = 'inline-block';
      div.style.border = '1px solid';
      div.style.width = '100px';
      //canvas
      const canvas = document.createElement('canvas');
      div.appendChild(canvas);
      canvas.height = this.canvasHeight;
      canvas.width = this.tuneWidth;
      //button
      const button = document.createElement('button');
      button.innerHTML = type;
      button.style.width = '100%';
      div.appendChild(button);
      const turnLabel = document.createElement('label');
      turnLabel.style.color = 'green';
      turnLabel.innerHTML = 'Your Turn!';
      turnLabel.style.visibility = 'hidden';
      div.appendChild(turnLabel);
      button.onclick = startAudio(function(audioContext, stream) {that.matchTone(audioContext, stream, type, button, canvas, turnLabel);});
      graphDiv.appendChild(div);
      const span = document.createElement('span');
      span.style.width = '25px';
      span.style.display = 'inline-block';
      graphDiv.appendChild(span);
      this.canvases[type] = canvas;
    }
  }

  buildButtons(document, div, startAudio) {
    const that = this;

    //exemplar
    const exemplarDiv = document.createElement('div');
    var label = document.createElement('label');
    label.innerHTML = 'Example for this syllable: '
    exemplarDiv.appendChild(label);
    const exButton = document.createElement('button');
    exButton.innerHTML = 'Play!';
    exButton.onclick = function() {that.playExemplar(exButton);};
    exemplarDiv.appendChild(exButton);
    div.appendChild(exemplarDiv);
    //adjusted For voice
    const adjustedDiv = document.createElement('div');
    label = document.createElement('label');
    label.innerHTML = 'Adjusted for your vocal range: '
    adjustedDiv.appendChild(label);
    //play button
    const adjButton = document.createElement('button');
    adjButton.innerHTML = 'Play!';
    adjButton.onclick = startAudio(function(audioContext, stream) { that.playAdjusted(audioContext, adjButton, 1);});
    adjustedDiv.appendChild(adjButton);
    //play slow
    const adjSlowButton = document.createElement('button');
    adjSlowButton.innerHTML = 'Play Slower';
    adjSlowButton.onclick = startAudio(function(audioContext, stream) { that.playAdjusted(audioContext, adjSlowButton, 0.5);});
    adjustedDiv.appendChild(adjSlowButton);
    //add to div
    div.appendChild(adjustedDiv);

  }

  checkState() {
    return(this.playState != 'playing' && Object.keys(Chars.data).includes(this.char));
  }

  try(audioContext,stream,button,canvas) {
    const that = this;

    if(!this.checkState()) return;
    this.playState = 'playing';
    const buttonFn = button.onclick;
    button.style.backgroundColor = ProduceTrainer.playColor;
    button.onclick = function() {};

    const analyzer = audioContext.createAnalyser();
    analyzer.fftsize = Math.pow(2,9);
    const sampleRate = audioContext.sampleRate;
    audioContext.createMediaStreamSource(stream).connect(analyzer);

    const data = new Float32Array(analyzer.fftSize);

    var idx = 0;
    const maxMeasurements = Math.ceil(this.maxTryDuration*1000/this.measurementInterval)
    const st = new Array(maxMeasurements);
    const timestamps = new Array(maxMeasurements);
    //detect if voice
    var count = 0;
    var on = false;
    var onIdx = -1;

    const stop = function() {
      that.stop();
      that.playState = 'none';
      button.style.backgroundColor = ProduceTrainer.stoppedColor;
      button.onclick = buttonFn;
    }

    const intervalFn = function() {
      analyzer.getFloatTimeDomainData(data);
      //store f0
      st[idx] = 49 + 12*Math.log2(yin(data, sampleRate)/440);
      timestamps[idx] = new Date().getTime();
      //detect voice
      const vol = Math.log2(Math.sqrt(data.reduce((a, x) => a + x**2)/data.length));
      if(on == (vol < that.silence)) count += 1;
      if(count > that.tryDetectThreshold) {
        count = 0;
        if(!on) {
          on = true;
          onIdx = idx;
        } else {
          that.plotTry(st, timestamps, onIdx, idx);
          stop();
        }
      }
      idx += 1;
    }

    this.timeouts.push(setInterval(intervalFn, this.measurementInterval));
    this.timeouts.push(setTimeout(function() {that.plotTry(st, timestamps, onIdx, idx-1); stop()}, this.maxTryDuration*1000));
  }

  plotTry(st, timestamps, startIdx, endIdx) {
    if(startIdx == -1) return;//didn't detect anything
    startIdx = Math.max(0, startIdx - this.tryDetectThreshold);
    endIdx = Math.max(0, endIdx - this.tryDetectThreshold);
    const idxs = []
    const start = timestamps[startIdx];
    const duration = timestamps[endIdx] - start;
    const contour = [];
    for(var i = startIdx; i <= endIdx; i++) {
      if(0.5 + (st[i]-this.mean)/this.height > 0) contour.push([(timestamps[i] - start)/duration,st[i]]);
    }
    const citationContour = this.audioProducer.getToneContour(this.tone,this.mean,this.sd);
    const contours = [
      {color:'black', contour: citationContour},
      {color:'green', contour: contour}
    ]
    ProduceTrainer.drawContours(this.tryCanvas, contours, this.tryMargin,this.mean, this.height);
  }

  matchTone(audioContext, stream, type, button, canvas, turnLabel) {
    if(!this.checkState()) return;
    this.playState = 'playing';
    const buttonFn = button.onclick;
    button.style.backgroundColor = ProduceTrainer.playColor
    button.innerHTML = 'click to stop';
    let that = this;

    //setup recording/analyzing
    const analyzer = audioContext.createAnalyser();
    analyzer.fftsize = Math.pow(2,9);
    audioContext.createMediaStreamSource(stream).connect(analyzer)
    const sampleRate = audioContext.sampleRate;
    const data = new Float32Array(analyzer.fftSize)
    const targetSt = this.audioProducer.getSt(this.tone, this.mean, this.sd, type == 'start');
    const targetY = Math.max(0, Math.min(1, 0.5 + (targetSt-that.mean)/that.height));

    const smoother = ProduceTrainer.getSmoother(ProduceTrainer.smoothLength, ProduceTrainer.smoothThreshold);
    const intervalFn = function() {
      analyzer.getFloatTimeDomainData(data);
      const st = 49 + 12*Math.log2(yin(data, sampleRate)/440);
      const val = Math.max(0, Math.min(1, 0.5 + (st-that.mean)/that.height));
      const smoothedVal = smoother(val);
      ProduceTrainer.drawLine(canvas, targetY, smoothedVal);
    }

    // define guidetone
    const audioNode = this.audioProducer.guideTone(audioContext, this.char, this.tone, this.mean, this.sd, type == 'start', this.guideToneDuration)
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 1.3;
    audioNode.connect(gainNode).connect(audioContext.destination);

    const stopMatching = function() {
      button.style.backgroundColor = ProduceTrainer.stoppedColor;
      that.stop();
      button.onclick = buttonFn;
      button.innerHTML = type;
      turnLabel.style.visibility = 'hidden';
      audioNode.stop();
    }
    button.onclick = stopMatching;

    audioNode.start();

    this.timeouts.push(setTimeout(function() { turnLabel.style.visibility = 'visible'; that.timeouts.push(setInterval(intervalFn, this.measurementInterval))}, this.guideToneDuration*1000));
    this.timeouts.push(setTimeout(function() {stopMatching();}, this.tuneDuration*1000));
  }

  static clearCanvas(canvas) {
    let ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.beginPath();
  }

  //if zero, only add to the array if had more than zeroThreshold in a row
  static getSmoother = (size, zeroThreshold) => {
    var idx = 0;
    var active = false;
    const array = new Array(size);
    var zeroCount = 0;

    return(function(val) {
      if(val == 0) zeroCount += 1;
      else zeroCount = 0;

      if(val != 0 || zeroCount > zeroThreshold) {
        array[idx] = val;
        idx = (idx + 1) % size;
        if(idx == 0) active = true;
      }
      if(!active) return(null);
      return(array.reduce((a,b) => a + b)/size);
    });
  }

  //start, end are floats between 0 and 1, and go UP
  static drawLine(canvas, contour, redLine) {
    ProduceTrainer.clearCanvas(canvas);
    let ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0,(1-contour)*canvas.height);
    ctx.lineTo(canvas.width, (1-contour)*canvas.height);
    ctx.strokeStyle = 'black';
    ctx.stroke();
    if(!(redLine == null)) {
      ctx.beginPath();
      ctx.moveTo(0,(1-redLine)*canvas.height);
      ctx.lineTo(canvas.width, (1-redLine)*canvas.height);
      ctx.strokeStyle = (Math.abs(redLine - contour) < ProduceTrainer.band)? 'green':'red';
      ctx.stroke();
    }
  }

  playExemplar(button) {
    const that = this;
    if(!this.checkState()) return;
    this.playState = 'playing'
    var audio = new Audio(Chars.data[this.char]['filename']);
    button.style.backgroundColor = ProduceTrainer.playColor
    audio.onended = function() { that.stop();button.style.backgroundColor = ProduceTrainer.stoppedColor;};
    audio.play();
  }

  playAdjusted(audioContext, button, speed) {
    const that = this;
    //ui stuff
    if(!this.checkState()) return;
    this.playState = 'playing'
    button.style.backgroundColor = ProduceTrainer.playColor;
    //play audio
    const duration = this.adjustedDuration/speed;
    const audioNode = this.audioProducer.adjustedTone(audioContext, this.char, this.tone, this.mean, this.sd, duration)
    // start guidetone
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 1.3;
    audioNode.connect(gainNode).connect(audioContext.destination);
    audioNode.start();
    audioNode.stop(duration*1000);
    //ui stuff
    audioNode.onended = function() {
      that.stop();
      button.style.backgroundColor = ProduceTrainer.stoppedColor;
    }
  }

  stop() {
    this.playState = 'none';
    for(const timeout of this.timeouts) {
      clearTimeout(timeout);
    }
    this.timeouts = [];
  }

  updateChar(char) {
    this.char = char;
    this.tone = Chars.data[this.char]['tone'];
    for(const [type, canvas] of Object.entries(this.canvases)) {
      ProduceTrainer.clearCanvas(canvas);
      const targetSt = this.audioProducer.getSt(this.tone, this.mean, this.sd, type == 'start');
      const targetY = Math.max(0, Math.min(1, 0.5 + (targetSt-this.mean)/this.height));
      ProduceTrainer.drawLine(canvas, targetY, null);
    }
    const contour = this.audioProducer.getToneContour(this.tone,this.mean,this.sd);
    ProduceTrainer.drawContours(this.tryCanvas, [{'color': 'black', 'contour': contour}], this.tryMargin,this.mean, this.height);
  }

  static drawContours(canvas, contours, margin, mean, height) {
    ProduceTrainer.clearCanvas(canvas);
    const ctx = canvas.getContext('2d');
    if(canvas.width < 2*margin) {console.log('canvas too small for margins'); return;}
    ctx.lineWidth = 3;
    for(const contourInfo of contours) {
      ctx.beginPath();
      ctx.strokeStyle = contourInfo['color'];
      const contour = contourInfo['contour'];
      for(var idx = 0; idx < contour.length; idx ++) {
        const x = margin + contour[idx][0]*(canvas.width - 2*margin)
        const y = canvas.height * (1-(0.5 + (contour[idx][1]-mean)/height))
        if(idx == 0) {
          ctx.moveTo(x,y);
        } else {
          ctx.lineTo(x,y);
          ctx.stroke();
        }
      }
    }
  }

  updateParams(mean, sd, silence) {
    this.mean = mean;
    this.sd = sd;
    if(silence > 0) this.silence = Math.max(ProduceTrainer.tryDBCutoff, Math.log2(silence)) + ProduceTrainer.silenceBuffer;
    else this.silence = ProduceTrainer.tryDBCutoff + ProduceTrainer.silenceBuffer;
  }

  show() {
    this.div.style.display = 'block';
  }

  hide() {
    this.div.style.display = 'none';
  }

}
