class MatchListener {
  static sounds = ['fan','fu','haam','ham','hau','hon','jam','jan','jau','ji','jim','jin','jing','jiu','joeng','jung','jyu','jyun','se','seoi','seon','si','sin','soeng','syu','syun','wai','wan'];

  static toneHeight = 60;
  static buttonWidth = 75;
  static tones = {
    all: [1,2,3,4,5,6],
    register: [1,3,6],
    contour: [2,4,5],
  }
  static states = ['pick','mouse','ready','checked'];//no playing state: can play multiple at once
  static canvasParams = {
    stim: {color:'lawngreen',text:'Play'},
    ref: {color:'lawngreen',text:'Play'},
    match: {color:'skyblue',text:'Match'},
    matching: {color:'blue',text:'Match '},
    target: {color:'skyblue',text:'Tone '}
  }

  canvas;
  clickBoxes;
  correctButton;
  newDiv;

  //state
  state;

  //trial settings
  toneSubset;
  showReference;
  stimSounds;

  //trial state
  mouseStart;
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
    div.appendChild(this.canvas);
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
    const subset = MatchListener.createSubsets(document, this.newDiv);
    //onclick
    newButton.onclick = function() {that.new(!ref.checked, scramble.checked, !injective.checked, subset.value);}//note the ! to reverse because of text to match
    div.appendChild(this.newDiv);
    newButton.onclick();
  }

  setupCanvas() {
    const that = this;
    this.canvas.height = MatchListener.toneHeight * this.toneSubset.length;
    this.canvas.width = 800;
    this.canvas.style.display = 'block';
    this.canvas.onclick = function(e) { that.click(e.clientX - that.canvas.offsetLeft, e.clientY - that.canvas.offsetTop);};
    //clickboxes
    this.clickBoxes = [];
    for(var i = 0; i < this.toneSubset.length; i++) {
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
        this.toneSubset[i])
      );
      //reference stimuli
      this.clickBoxes.push(MatchListener.clickBox(
        '',
        this.canvas.width - MatchListener.buttonWidth, this.canvas.width, startY, endY,
        'ref',
        function() {that.playReference(that.toneSubset[boxId]);},
        '')
      );
    }
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
        var newLines = []
        for(var line of this.lines) if(this.mouseStart != line['startInd']) newLines.push(line);
        this.lines = newLines;
        this.lines.push({
          startY: MatchListener.toneHeight*(0.5+this.mouseStart), 
          endY: MatchListener.toneHeight*(0.5+id),
          guess: this.toneSubset[id],//guess is by tone, startInd is by position
          startInd: this.mouseStart,
          color: 'black',
          type: 'guess',
          dashed: false});
      }
    }
    this.update();
  }

  playStimuli(i) {
    new Audio('wav/humanum/' + this.stimSounds[i] + '.wav').play();
  }

  playReference(i) {
    if(this.showReference) new Audio('wav/humanum/si' + i + '.wav').play();
  }


  click(x,y) {
    for(const clickBox of this.clickBoxes) {
      clickBox['func'](x,y);
    }
  }

  correct() {
    this.state = 'checked';
    const correctAnswers = [];
    const newLines = [];
    for(var line of this.lines) {
      const correctTone = this.stimSounds[line['startInd']].charAt(this.stimSounds[line['startInd']].length-1);
      const correctAnswer = correctTone == line['guess'];
      if(correctAnswer) {
        line.color = 'green';
        newLines.push(line);
      } else {
        line.color = 'red';
        newLines.push(line);
        newLines.push({
          startY: line['startY'],
          endY: MatchListener.toneHeight*(0.5+this.toneSubset.indexOf(parseInt(correctTone))),
          guess: null,
          startInd: line['startInd'],
          color: 'black',
          type:'corrected',
          dashed: true
        });
      }
    }
    this.lines = newLines;
    this.update();
  }

  update() {
    //state stuff
    if(this.state == 'pick' && MatchListener.numGuesses(this.lines) == this.toneSubset.length) this.state = 'ready';
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
    for(var line of this.lines) {
      MatchListener.drawLine(this.canvas, ctx, line);
    }
    //buttons and divs
    this.correctButton.style.visibility = this.state == 'ready'?'visible':'hidden';
  }

  new(ref, scr, inj, subset) {
    this.showReference = ref;
    this.toneSubset = MatchListener.tones[subset];
    this.setupCanvas();
    //next tone
    const sound = MatchListener.sounds[Math.floor(Math.random() * MatchListener.sounds.length)];
    var tones = [];
    var sounds = [];
    for(const tone of this.toneSubset) {
      sounds.push(scr?MatchListener.sounds[Math.floor(Math.random() * MatchListener.sounds.length)]:sound);
      tones.push(inj?tone:this.toneSubset[Math.floor(Math.random()*this.toneSubset.length)]);
    }
    tones = MatchListener.shuffle(tones);
    sounds = MatchListener.shuffle(sounds);
    this.stimSounds = [];
    for(var i = 0; i < tones.length; i ++) {
      this.stimSounds.push(sounds[i] + tones[i]);
    }
    this.state = 'pick';
    this.lines = []
    this.checkedLines = []
    this.mouseStart = null;
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

  static drawLine(canvas, ctx, line) {
    ctx.strokeStyle = line['color'];
    ctx.setLineDash(line['dashed']?[5,15]:[]);
    ctx.beginPath();
    ctx.moveTo(MatchListener.buttonWidth*2, line['startY']);
    ctx.lineTo(canvas.width - MatchListener.buttonWidth*2, line['endY']);
    ctx.stroke();
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

  static createSubsets(document, div) {
    const select = document.createElement('select');
    for(const key of Object.keys(MatchListener.tones)) {
      let opt = document.createElement('option');
      opt.value = key;
      opt.innerHTML = key;
      select.appendChild(opt);
    }
    div.appendChild(select)
    const label = document.createElement('label');
    label.innerHTML = 'Tone Subset';
    div.appendChild(label);
    return(select);
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

  static numGuesses(lines) {
    var guesses = 0;
    for(var line of lines) {
      if(line['type'] == 'guess') guesses += 1;
    }
    return(guesses);
  }
}
