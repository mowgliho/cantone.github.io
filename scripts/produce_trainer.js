class ProduceTrainer {
  adjustedDuration = 0.7;
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
    //finish up
    parentDiv.appendChild(this.div);
    this.playState = 'none'
  }

  playExemplar(button) {
    const that = this;
    if(this.playState == 'playing' || !(Object.keys(Chars.data).includes(this.char))) return;
    this.playState = 'playing'
    var audio = new Audio(Chars.data[this.char]['filename']);
    button.style.backgroundColor = ProduceTrainer.playColor
    audio.onended = function() { that.playState = 'none';button.style.backgroundColor = ProduceTrainer.stoppedColor;};
    audio.play();
  }

  playAdjusted(audioContext, button, speed) {
    const that = this;
    //ui stuff
    if(this.playState == 'playing' || !(Object.keys(Chars.data).includes(this.char))) return;
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
      that.playState = 'none';
      button.style.backgroundColor = ProduceTrainer.stoppedColor;
    }
  }

  updateChar(char) {
    this.char = char;
    this.tone = Chars.data[this.char]['tone'];
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
