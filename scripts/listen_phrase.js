class PhraseListener {
  //for dynamically creating stuff
  document;

  randomOptions;
  randomCharSelectors;
  randomPronSelectors;
  randomCountLabel;
  randomGoButton;

  //divs
  chooseDiv;
  showChoiceDiv;
  listenDiv;
  playDiv;
  referenceDiv;
  answerDiv;
  guessDiv;

  //ui stuff
  guessInput;
  guessButton;
  jyutpingField;
  transField;


  //state
  chooseState;
  listenState;
  text;

  constructor(document) {
    const that = this;
    this.document = document;

    const div = document.getElementById('div-listen-phrase');
    //choose div
    this.chooseDiv = document.createElement('div');
    this.buildChooser(document, this.chooseDiv);
    div.appendChild(this.chooseDiv);
    //show choice div
    this.showChoiceDiv = document.createElement('div');
    this.buildShowChoice(document, this.showChoiceDiv);
    div.appendChild(this.showChoiceDiv);
    div.appendChild(document.createElement('hr'));
    //listen div
    this.listenDiv = document.createElement('div');
    this.buildListenDiv(document, this.listenDiv); 
    div.appendChild(this.listenDiv);

    this.chooseState = 'choose';
    this.listenState = null;
    this.update();
  }

  update() {
    const that = this;
    if(this.chooseState == 'choose') {
      this.chooseDiv.style.display = 'block';
      this.showChoiceDiv.style.display = 'none';
    } else if(this.chooseState == 'hide') {
      this.chooseDiv.style.display = 'none';
      this.showChoiceDiv.style.display = 'block';
    }
    if(this.listenState == null || !Object.keys(Phrases.data).includes(this.text)) {
      this.listenDiv.style.visibility = 'hidden';
    } else if(this.listenState == 'start') {
      console.log(this.text);
      this.playDiv.innerHTML = "";
      var i = 0;
      for(const [db,files] of Object.entries(Phrases.data[this.text]['files'])) {
        for(const fn of files) {
          const button = this.document.createElement('button');
          button.className = 'pretty-button';
          button.innerHTML = 'Speaker ' + i;
          button.onclick = function() {
            var audio = new Audio(fn);
            button.style.backgroundColor = 'LawnGreen';
            audio.onended = function() { button.style.backgroundColor = '';};
            audio.play();
          };
          this.playDiv.appendChild(button);
          console.log(fn);
          i += 1;
        }
      }
      this.guessInput.value = '';
      this.guessButton.style.visibility = 'visible';
      this.listenDiv.style.visibility = 'visible';
      this.answerDiv.style.visibility = 'hidden';
      this.referenceDiv.style.visibility = 'hidden';
      this.jyutpingField.innerHTML = '';
      this.transField.innerHTML = '';
    } else if(this.listenState == 'guessed') {
      this.guessButton.style.visibility = 'hidden';
      this.listenDiv.style.visibility = 'visible';
      this.answerDiv.style.visibility = 'visible';
      this.referenceDiv.style.visibility = 'visible';
    }
  }

  updateAnswerDiv(guess) {
    this.answerDiv.innerHTML = ''
    const answerLabel = this.document.createElement('label');
    answerLabel.innerHTML = 'The correct tones are: ';
    this.answerDiv.appendChild(answerLabel);
    for(var i = 0; i < this.text.length; i++) {
      const label = this.document.createElement('label');
      const correctTone = Phrases.data[this.text]['tones'].charAt(i);
      label.innerHTML = correctTone;
      if(guess.length > i) {
        label.style.color = correctTone == guess.charAt(i)?'green':'red';
      } else {
        label.style.color = 'red';
      }
      this.answerDiv.appendChild(label);
    }
  }

  guess(value) {
    if(this.listenState != 'start') return;
    this.listenState = 'guessed';
    this.updateAnswerDiv(value);
    this.update();
  }

  updateRandomOptions() {
    this.randomOptions = new Set();
    for(const [key,value] of Object.entries(Phrases.data)) {
      if(value['num_char'] >= this.randomCharSelectors[0].value && 
        value['num_char'] <= this.randomCharSelectors[1].value && 
        value['num_pron'] >= this.randomPronSelectors[0].value && 
        value['num_pron'] <= this.randomPronSelectors[1].value) {
        this.randomOptions.add(key);
      }
    }
    this.randomCountLabel.innerHTML = this.randomOptions.size + ' choices';
    this.randomGoButton.style.visibility = this.randomOptions.size == 0?'hidden':'visible';
  }

  chooseRandom() {
    if(this.randomOptions.size == 0) return;
    const items = Array.from(this.randomOptions);
    this.newText(items[Math.floor(Math.random()*items.length)]);
  }

  newText(text) {
    this.chooseState = 'hide';
    this.text = text;
    this.listenState = 'start';
    this.update();
  }

  //build stuff
  buildListenDiv(document,div) {
    const that = this;

    //play div
    this.playDiv = document.createElement('div');
    div.appendChild(this.playDiv);
    //guess div
    this.guessDiv = document.createElement('div');
    const guessLabel = document.createElement('label');
    guessLabel.innerHTML = 'What tone(s) is(are) being spoken? '
    this.guessDiv.appendChild(guessLabel);
    this.guessInput = document.createElement('input');
    this.guessInput.type = 'text';
    this.guessDiv.appendChild(this.guessInput);
    this.guessButton = document.createElement('button');
    this.guessButton.innerHTML = 'Guess';
    this.guessButton.onclick = function() {that.guess(that.guessInput.value);};
    this.guessDiv.appendChild(this.guessButton);
    div.appendChild(this.guessDiv);
    //answer div
    this.answerDiv = document.createElement('div');
    div.appendChild(this.answerDiv);
    //reference div
    this.referenceDiv = document.createElement('div');
    //jp
    const jyutpingDiv = document.createElement('div');
    const jyutpingButton = document.createElement('button');
    jyutpingButton.innerHTML = 'Show Pronunciation'
    this.jyutpingField = document.createElement('label');
    jyutpingButton.onclick = function() {that.jyutpingField.innerHTML = ' ' + Phrases.data[that.text]['jyutping'];};
    jyutpingDiv.appendChild(jyutpingButton);
    jyutpingDiv.appendChild(this.jyutpingField);
    //trans
    const transDiv = document.createElement('div');
    const transButton = document.createElement('button');
    transButton.innerHTML = 'Show Translation'
    this.transField = document.createElement('label');
    transButton.onclick = function() {that.transField.innerHTML = ' ' + Phrases.data[that.text]['translation'];};
    transDiv.appendChild(transButton);
    transDiv.appendChild(this.transField);
 
    this.referenceDiv.appendChild(jyutpingDiv);
    this.referenceDiv.appendChild(transDiv);
    div.appendChild(this.referenceDiv);
  }


  buildShowChoice(document,div) {
    const that = this;

    const button = document.createElement('button');
    button.innerHTML = 'Choose new phrase/word';
    button.onclick = function() {that.chooseState = 'choose'; that.update()}
    div.appendChild(button);
  }

  buildChooser(document,div) {
    this.buildFixedChooser(document,div);
    this.addSpan(div, 20);
    this.buildRandomChooser(document,div);
  }

  buildFixedChooser(document, parentDiv) {
    const that = this;

    const div = document.createElement('div');
    div.style.display = 'inline-block';
    div.style.verticalAlign = 'top';
    //label
    const label = document.createElement('label');
    label.innerHTML = 'From dropdown list: ';
    div.appendChild(label);
    //selector
    const selector = document.createElement('select');
    var opt = document.createElement('option');
    opt.value = '';
    opt.innerHTML = 'Select';
    selector.appendChild(opt);
    for(var text of Object.keys(Phrases.data)) {
      opt = document.createElement('option');
      opt.value = text;
      opt.innerHTML = text;
      selector.appendChild(opt)
    }
    div.appendChild(selector);
    //go button
    const button = document.createElement('button');
    button.innerHTML = 'Go!';
    button.onclick = function() {if(selector.value != '') that.newText(selector.value);};
    div.appendChild(button);
    parentDiv.appendChild(div);
  }

  buildRandomChooser(document, parentDiv) {
    const that = this;

    const div = document.createElement('div');
    div.style.display = 'inline-block';
    div.style.borderLeft = '1px solid #000';
    //label
    const goDiv = document.createElement('div');
    var label = document.createElement('label');
    label.innerHTML = 'Randomly: ';
    goDiv.appendChild(label);
    div.appendChild(goDiv);
    this.randomCountLabel = document.createElement('label');
    goDiv.appendChild(this.randomCountLabel);

    //get params
    var chars = new Set();
    var prons = new Set();
    for(var info of Object.values(Phrases.data)) {
      chars.add(info['num_char']);
      prons.add(info['num_pron']);
    }
    chars = Array.from(chars);
    prons = Array.from(prons);
    chars.sort((a,b) => a-b);
    prons.sort((a,b) => a-b);
    
    this.randomCharSelectors = this.buildDropdown(document, div, chars, 'Number of Characters: ')
    this.randomPronSelectors = this.buildDropdown(document, div, prons, 'Number of Pronunciations: ')

    for(var charS of this.randomCharSelectors) charS.onchange = function() {that.updateRandomOptions();}
    for(var pronS of this.randomPronSelectors) pronS.onchange = function() {that.updateRandomOptions();}

    this.randomGoButton = document.createElement('button');
    this.randomGoButton.innerHTML = 'Go!'
    this.randomGoButton.onclick = function() { that.chooseRandom() }
    goDiv.appendChild(this.randomGoButton);

    parentDiv.appendChild(div);
    that.updateRandomOptions();
  }

  addSpan(div, width) {
    const tab = this.document.createElement('span');
    tab.style.width = width + 'px';
    tab.style.display = 'inline-block';
    div.appendChild(tab);
  }

  buildDropdown(document, parentDiv, options, labelText) {
    const div = document.createElement('div');
    this.addSpan(div, 20);
    const label = document.createElement('label');
    label.innerHTML = labelText;
    div.appendChild(label);
    const addSelector = function(text, document, div, options) {
      const label = document.createElement('label');
      label.innerHTML = text;
      div.appendChild(label);
      const selector = document.createElement('select');
      var opt;
      for(var i of options) {
        opt = document.createElement('option');
        opt.value = i;
        opt.innerHTML = i;
        selector.appendChild(opt);
      }
      div.appendChild(selector);
      return(selector);
    }
    const minS = addSelector(' Min: ',document,div,options);
    const maxS = addSelector(' Max: ',document,div,options);
    minS.value = Math.min.apply(Math, options);
    maxS.value = Math.max.apply(Math, options);
    parentDiv.appendChild(div);
    return([minS, maxS]);
  }
}
