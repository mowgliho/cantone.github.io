class ProduceTrainer {
  static smoothLength = 5;
  static smoothThreshold = 10;
  height = 20;//number of sts tall the canvas is, with 0/mean in the middle.
  static band = 0.05;
  adjustedDuration = 0.7;
  tuneDuration = 8;
  guideToneDuration = 2;
  measurementInterval = 25;
  canvases;
  static playColor = 'LawnGreen';
  static stoppedColor = '';

  audioProducer = ChaoAudioProducer;
  div;
  octaveLabel;

  //stuff that changes
  mean;
  sd;
  char;
  tone;
  timeouts;

  //state
  playState;

  constructor(document, parentDiv, startAudio) {
    const that = this;
    this.div = document.createElement('div');
    //exemplar
    const exemplarDiv = document.createElement('div');
    var label = document.createElement('label');
    label.innerHTML = 'Example for this syllable: '
    exemplarDiv.appendChild(label);
    const exButton = document.createElement('button');
    exButton.innerHTML = 'Play!';
    exButton.onclick = function() {that.playExemplar(exButton);};
    exemplarDiv.appendChild(exButton);
    this.div.appendChild(exemplarDiv);
    //adjusted For voice
    const adjustedDiv = document.createElement('div');
    label = document.createElement('label');
    label.innerHTML = 'Adjusted for your vocal range: '
    adjustedDiv.appendChild(label);
    this.octaveLabel = document.createElement('label');
    this.octaveLabel.style.color = 'blue';
    adjustedDiv.appendChild(this.octaveLabel);
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
    this.div.appendChild(adjustedDiv);
    const graphDiv = document.createElement('div');
    this.canvases = {};
    for(const type of ['start','end']) {
      const div = document.createElement('div');
      div.style.display = 'inline-block';
      div.style.border = '1px solid';
      div.style.width = '100px';
      //canvas
      const canvas = document.createElement('canvas');
      div.appendChild(canvas);
      canvas.height = '500';
      canvas.width = '100';
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
    this.div.appendChild(graphDiv);
    //finish up
    parentDiv.appendChild(this.div);
    this.timeouts = [];
    this.playState = 'none'
  }

  checkState() {
    return(this.playState != 'playing' && Object.keys(Chars.data).includes(this.char));
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
    const targetSt = ChaoAudioProducer.getSt(this.tone, this.mean, this.sd, type == 'start');
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
      const targetSt = ChaoAudioProducer.getSt(this.tone, this.mean, this.sd, type == 'start');
      const targetY = Math.max(0, Math.min(1, 0.5 + (targetSt-this.mean)/this.height));
      ProduceTrainer.drawLine(canvas, targetY, null);
    }
  }

  updateParams(mean, sd) {
    this.mean = mean;
    this.sd = sd;
    var shift = this.audioProducer.shift(mean);
    if(shift > 0) {
      this.octaveLabel.innerHTML = '(shifted up ' + shift + ' octave' + (shift > 1?'s':'') + ' for audibility) ';
    } else {
      this.octaveLabel.innerHTML = '';
    }
  }

  show() {
    this.div.style.display = 'block';
  }

  hide() {
    this.div.style.display = 'none';
  }

}
