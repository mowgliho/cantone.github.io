class MatchListener {
  static sounds = ['fan','fu','haam','ham','hau','hon','jam','jan','jau','ji','jim','jin','jing','jiu','joeng','jung','jyu','jyun','se','seoi','seon','si','sin','soeng','syu','syun','wai','wan'];

  static toneHeight = 60;
  static buttonWidth = 75;
  static tones = [1,2,3,4,5,6];
  static states = ['pick','mouse','next'];//no playing state: can play multiple at once

  canvas;
  clickBoxes;
  correctButton;
  nextDiv;

  //state
  state;

  //trial settings
  showReference;
  stimSounds;

  //trial state
  lines;

  constructor(document) {
    const that = this;

    const div = document.getElementById('div-listen-match');
    //instruction div
    const instructionDiv = document.createElement('div');
    instructionDiv.innerHTML = 'Match the sounds with the tones:';
    div.appendChild(instructionDiv);
    //canvas
    this.canvas = document.createElement('canvas');
    this.canvas.height = MatchListener.toneHeight * MatchListener.tones.length;
    this.canvas.width = 800;
    this.canvas.style.display = 'block';
    this.canvas.onclick = function(e) { that.click(e.clientX - that.canvas.offsetLeft, e.clientY - that.canvas.offsetTop);};
    div.appendChild(this.canvas);
    //clickboxes
    this.clickBoxes = [];
    for(var i = 0; i < MatchListener.tones.length; i++) {
      const boxId = i;
      //play stimuli
      this.clickBoxes.push(MatchListener.clickBox(
        0, MatchListener.buttonWidth, i*MatchListener.toneHeight, (i+1)*MatchListener.toneHeight,
        'stim',
        function() {that.playStimuli(boxId);})
      );
      //reference stimuli
      this.clickBoxes.push(MatchListener.clickBox(
        this.canvas.width - MatchListener.buttonWidth, this.canvas.width, i*MatchListener.toneHeight, (i+1)*MatchListener.toneHeight,
        'ref',
        function() {that.playReference(boxId);})
      );
    }
    //correct button
    this.correctButton = document.createElement('button');
    this.correctButton.innerHTML = 'Check Answers';
    this.correctButton.onclick = function() {that.correct();}
    div.appendChild(that.correctButton);
    //next
    this.nextDiv = document.createElement('div');
    const nextButton = document.createElement('button');
    nextButton.innerHTML = 'Next';
    this.nextDiv.appendChild(nextButton);
    //checkboxes
    const ref = MatchListener.createCheckbox(document,this.nextDiv,'no reference tones','ref');
    const scramble = MatchListener.createCheckbox(document,this.nextDiv,'scrambled sounds','scramble');
    const injective = MatchListener.createCheckbox(document,this.nextDiv,'non-injective','inject');
    //onclick
    nextButton.onclick = function() {that.next(!ref.checked, scramble.checked, !injective.checked);}//note the ! to reverse because of text to match
    div.appendChild(this.nextDiv);
    nextButton.onclick();
  }

  static clickBox(minX, maxX, minY, maxY, type, callback) {
    const cback = callback;
    return {
      dims:{minX:minX, maxX: maxX, minY:minY, maxY:maxY},
      type: type,
      func: function(x,y) {
        if(x > minX && x < maxX && y > minY && y < maxY) callback();
      }
    }
  }

  playStimuli(i) {
    new Audio('wav/humanum/' + this.stimSounds[i] + '.wav').play();
  }

  playReference(i) {
    if(this.showReference) new Audio('wav/humanum/si' + (i+1) + '.wav').play();
  }


  click(x,y) {
    for(const clickBox of this.clickBoxes) {
      clickBox['func'](x,y);
    }
  }

  correct() {
    this.state = 'next';
    this.update();
  }

  update() {
    var ctx = this.canvas.getContext("2d");
    ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    for(var clickBox of this.clickBoxes) {
      if(!this.showReference && clickBox['type'] == 'ref') continue;
      var dim = clickBox['dims']
      //fill rectangle
      ctx.fillStyle = 'green';
      ctx.fillRect(dim['minX'],dim['minY'],dim['maxX']-dim['minX'],dim['maxY']-dim['minY']);
      //border
      ctx.beginPath();
      ctx.strokeStyle = 'black';
      ctx.rect(dim['minX'],dim['minY'],dim['maxX']-dim['minX'],dim['maxY']-dim['minY']);
      ctx.stroke();
      //text
      ctx.fillStyle = 'black';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.font = '12px Arial';
      ctx.fillText('Play',(dim['minX'] + dim['maxX'])/2,(dim['minY']+dim['maxY'])/2);
    }
  }

  next(ref, scr, inj) {
    this.showReference = ref;
    //next tone
    const sound = MatchListener.sounds[Math.floor(Math.random() * MatchListener.sounds.length)];
    var tones = [];
    var sounds = [];
    for(const tone of MatchListener.tones) {
      sounds.push(scr?MatchListener.sounds[Math.floor(Math.random() * MatchListener.sounds.length)]:sound);
      tones.push(inj?tone:MatchListener.tones[Math.floor(Math.random()*MatchListener.tones.length)]);
    }
    tones = MatchListener.shuffle(tones);
    sounds = MatchListener.shuffle(sounds);
    this.stimSounds = [];
    for(var i = 0; i < tones.length; i ++) {
      this.stimSounds.push(sounds[i] + tones[i]);
    }
    this.state = 'pick';
    this.update();
  }

  static createCheckbox(document, div, text, key) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = 'listen-match-checkbox-' + key;
    div.appendChild(input);
    const label = document.createElement('label');
    label.innerHTML = text;
    div.appendChild(label);
    return(input);
  }

  static shuffle(array) {
    var idx = array.length;
    while (0 !== idx) {
      // Pick a remaining element...
      const rIdx = Math.floor(Math.random() * idx);
      idx--;
      // And swap it with the current element.
      [array[idx], array[rIdx]] = [array[rIdx], array[idx]];
    }
    return array;
  }
}
