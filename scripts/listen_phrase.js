class PhraseListener {
  randomOptions;
  randomCharSelectors;
  randomPronSelectors;
  randomCountLabel;
  randomGoButton;

  constructor(document) {
    const that = this;
    const div = document.getElementById('div-listen-phrase');
    this.buildChooser(document, div);
  }

  buildChooser(document,div) {
    this.buildFixedChooser(document,div);
    div.appendChild(document.createElement('hr'));
    this.buildRandomChooser(document,div);
  }

  buildFixedChooser(document, parentDiv) {
    const that = this;

    const div = document.createElement('div');
    //label
    const label = document.createElement('label');
    label.innerHTML = 'Select from dropdown list: ';
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
    //label
    const goDiv = document.createElement('div');
    var label = document.createElement('label');
    label.innerHTML = 'Select randomly: ';
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

  buildDropdown(document, parentDiv, options, labelText) {
    const div = document.createElement('div');
    const tab = document.createElement('span');
    tab.style.width = '20px';
    tab.style.display = 'inline-block';
    div.appendChild(tab);
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
    console.log(text);
  }
}
