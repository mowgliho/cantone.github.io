class MatchListener {
  static sounds = ['fan','fu','haam','ham','hau','hon','jam','jan','jau','ji','jim','jin','jing','jiu','joeng','jung','jyu','jyun','se','seoi','seon','si','sin','soeng','syu','syun','wai','wan'];

  static toneHeight = 60;
  static buttonWidth = 75;
  static tones = [1,2,3,4,5,6];
  static states = ['pick','mouse','ready','checked'];//no playing state: can play multiple at once

  canvas;
  clickBoxes;
  correctButton;
  newDiv;

  //state
  state;

  //trial settings
  showReference;
  stimSounds;

  //trial state
  mouseStart;
  lines;
  checkedLines;

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
      const startY = i*MatchListener.toneHeight;
      const endY = (i+1)*MatchListener.toneHeight;
      //play stimuli
      this.clickBoxes.push(MatchListener.clickBox(
        '',
        0, MatchListener.buttonWidth, startY, endY,
        'stim',
        function() {that.playStimuli(boxId);},
        '')
      );
      //match boxes
      this.clickBoxes.push(MatchListener.clickBox(
        i,
        MatchListener.buttonWidth, 2*MatchListener.buttonWidth, startY, endY,
        'match',
        function() {that.match(boxId, true);},
        '')
      );
      //target boxes
      this.clickBoxes.push(MatchListener.clickBox(
        '',
        this.canvas.width - 2*MatchListener.buttonWidth, this.canvas.width - MatchListener.buttonWidth, startY, endY,
        'target',
        function() {that.match(boxId, false);},
        boxId + 1)
      );
      //reference stimuli
      this.clickBoxes.push(MatchListener.clickBox(
        '',
        this.canvas.width - MatchListener.buttonWidth, this.canvas.width, startY, endY,
        'ref',
        function() {that.playReference(boxId);},
        '')
      );
    }
    //correct button
    this.correctButton = document.createElement('button');
    this.correctButton.innerHTML = 'Check Answers';
    this.correctButton.onclick = function() {that.correct();}
    div.appendChild(that.correctButton);
    //new
    this.newDiv = document.createElement('div');
    const newButton = document.createElement('button');
    newButton.innerHTML = 'New Set';
    this.newDiv.appendChild(newButton);
    //checkboxes
    const ref = MatchListener.createCheckbox(document,this.newDiv,'no reference tones','ref');
    const scramble = MatchListener.createCheckbox(document,this.newDiv,'scrambled sounds','scramble');
    const injective = MatchListener.createCheckbox(document,this.newDiv,'non-injective','inject');
    //onclick
    newButton.onclick = function() {that.new(!ref.checked, scramble.checked, !injective.checked);}//note the ! to reverse because of text to match
    div.appendChild(this.newDiv);
    newButton.onclick();
  }

  //id of box, start is whether is start of arrow or end
  match(id, start) {
    if((this.state == 'pick' || this.state == 'ready') && start) {
      this.state = 'mouse';
      this.mouseStart = id;
    } else if(this.state == 'mouse') {
      if(start && id == this.mouseStart) {
        this.state = 'pick';
      } else if(!start) {
        this.state = 'pick';
        if(Object.keys(this.lines).includes(this.mouseStart)) delete this.lines[this.mouseStart];
        this.lines[this.mouseStart] = {
          startY: MatchListener.toneHeight*(0.5+this.mouseStart), 
          endY: MatchListener.toneHeight*(0.5+id),
          guess: id,
          color: 'black'};
      }
    }
    this.update();
  }

  static clickBox(id, minX, maxX, minY, maxY, type, callback, suffix) {
    const cback = callback;
    return {
      id: id,
      dims:{minX:minX, maxX: maxX, minY:minY, maxY:maxY},
      type: type,
      suffix: suffix,
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
    this.state = 'checked';
    const correctAnswers = [];
    for(const [key,value] of Object.entries(this.lines)) {
      const correctTone = this.stimSounds[key].charAt(this.stimSounds[key].length-1);
      const correctAnswer = correctTone == value['guess']+1;
      if(correctAnswer) correctAnswers.push(key);
      this.checkedLines.push({
        startY: MatchListener.toneHeight*(0.5+parseInt(key)), 
        endY: MatchListener.toneHeight*(0.5+parseInt(correctTone)-1),
        color:correctAnswer? 'green': 'red',
      });
    }
    for(const key of correctAnswers) {
      delete this.lines[key];
    }
    this.update();
  }

  static canvasParams = {
    stim: {color:'lawngreen',text:'Play'},
    ref: {color:'lawngreen',text:'Play'},
    match: {color:'skyblue',text:'Match'},
    matching: {color:'blue',text:'Match '},
    target: {color:'skyblue',text:'Tone '}
  }

  update() {
    //state stuff
    if(this.state == 'pick' && Object.values(this.lines).length == MatchListener.tones.length) this.state = 'ready';
    //paint
    var ctx = this.canvas.getContext("2d");
    ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    for(var clickBox of this.clickBoxes) {
      if(!this.showReference && clickBox['type'] == 'ref') continue;
      var type = clickBox['type'];
      if(this.state == 'mouse' && type == 'match' && clickBox['id'] == this.mouseStart) type = 'matching';
      const color = MatchListener.canvasParams[type]['color'];
      const text = MatchListener.canvasParams[type]['text'];
      var dim = clickBox['dims']
      //fill rectangle
      ctx.fillStyle = color;
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
      ctx.fillText(text + clickBox['suffix'],(dim['minX'] + dim['maxX'])/2,(dim['minY']+dim['maxY'])/2);
    }
    for(var line of Object.values(this.lines)) {
      MatchListener.drawLine(this.canvas, ctx, line, this.state == 'checked'?true:false);
    }
    for(var line of this.checkedLines) {
      MatchListener.drawLine(this.canvas, ctx,line, false);
    }
    //buttons and divs
    this.correctButton.style.visibility = this.state == 'ready'?'visible':'hidden';
  }

  static drawLine(canvas, ctx, line, dashed) {
    ctx.strokeStyle = line['color'];
    ctx.setLineDash(dashed?[5,15]:[]);
    ctx.beginPath();
    ctx.moveTo(MatchListener.buttonWidth*2, line['startY']);
    ctx.lineTo(canvas.width - MatchListener.buttonWidth*2, line['endY']);
    ctx.stroke();
  }

  new(ref, scr, inj) {
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
    this.lines = {}
    this.checkedLines = []
    this.mouseStart = null;
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
