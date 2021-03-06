class ProtoProducer {
  static ANY = 'any';
  pickDiv;
  selectors;
  syllableLabel;
  newDiv;
  trainer;

  //state
  //[pick, show]
  state;

  constructor(document, startAudio, div) {
    this.selectors = {};
    this.pickDiv = this.buildPicker(document, div);
    this.newDiv = this.buildNew(document, div);
    div.appendChild(document.createElement('hr'));
    this.trainer = new ProduceTrainer(document, div, startAudio);
    this.updateOptions();
    this.pickNew();
  }

  buildNew(document,div) {
    const that = this;

    const newDiv = document.createElement('div');
    var label = document.createElement('label');
    label.innerHTML = 'Current Syllable is ';
    newDiv.appendChild(label);
    this.syllableLabel = document.createElement('label');
    this.syllableLabel.style.color = 'green';
    newDiv.appendChild(this.syllableLabel);
    label = document.createElement('label');
    label.innerHTML = ': ';
    newDiv.appendChild(label);
    const button = document.createElement('button');
    button.innerHTML = 'Pick new syllable';
    button.onclick = function() {that.pickNew()};
    newDiv.appendChild(button);
    div.appendChild(newDiv);
    return(newDiv);
  }

  buildPicker(document, div) {
    const that = this;

    const pickDiv = document.createElement('div');
    const label = document.createElement('label');
    label.innerHTML = 'Pick syllable: ';
    pickDiv.appendChild(label);
    for(const key of ['initial','final','tone']) {
      this.selectors[key] = this.addPickerBox(document, pickDiv, ' ' + key + ': ', key);
    }
    const button = document.createElement('button');
    button.innerHTML = 'Pick!';
    button.onclick = function() {that.pick();};
    pickDiv.appendChild(button);
    //wrap up
    div.appendChild(pickDiv);
    return(pickDiv);
  }

  addPickerBox(document, div, labelText, key) {
    const that = this;
    //label
    const label = document.createElement('label');
    label.innerHTML = labelText;
    div.appendChild(label);
    //selector
    const selector = document.createElement('select');
    this.addOption(document, selector, 'Any',ProtoProducer.ANY);
    var to_add = []
    for(const value of Object.values(Chars.data)) {
      const val = value[key]
      if(!to_add.includes(val)) {
        to_add.push(val);
      }
    }
    to_add.sort();
    for(const val of to_add) {
      this.addOption(document, selector, val == ''? '-':val, val);
    }
    //hook up
    selector.value = ProtoProducer.ANY;
    selector.onchange = function() { that.updateOptions()};
    div.appendChild(selector);
    return(selector);
  }

  addOption(document, selector, optText, optValue) {
    const opt = document.createElement('option');
    opt.innerHTML = optText;
    opt.value = optValue;
    selector.appendChild(opt);
  }

  //for each of initial, final, tone: find all options without this one: to be set to active
  updateOptions() {
    const params = {};
    const pos = {};
    for(const [key, selector] of Object.entries(this.selectors)) {
      params[key] = selector.value;
      pos[key] = new Set();
    }
    for(const value of Object.values(Chars.data)) {
      for(const key of Object.keys(pos)) {
        var valid = true;
        for(const test of Object.keys(pos)) {
          if(test == key) continue;
          if(params[test] != ProtoProducer.ANY && params[test] != value[test]) {
            valid = false;
            continue;
          }
        }
        if(valid) pos[key].add(value[key])
      }
    }
    for(const [param, values] of Object.entries(pos)) {
      for(const opt of this.selectors[param]) {
        opt.disabled = !(values.has(opt.value) || opt.value == ProtoProducer.ANY)
      }
    }
  }

  pick() {
    const pos = new Set();
    for(const [char,info] of Object.entries(Chars.data)) {
      var valid = true;
      for(const [key, selector] of Object.entries(this.selectors)) {
        if(selector.value != ProtoProducer.ANY && selector.value != info[key]) {
          valid = false;
          break;
        }
      }
      if(valid) pos.add(char);
    }
    let items = Array.from(pos);
    const char = items[Math.floor(Math.random() * items.length)];
    this.trainer.updateChar(char);
    this.syllableLabel.innerHTML = char;
    this.state = 'show';
    this.innerUpdate();
  }

  pickNew() {
    this.state = 'pick';
    this.innerUpdate();
  }

  innerUpdate() {
    if(this.state == 'pick') {
      this.pickDiv.style.display = 'block';
      this.newDiv.style.display = 'none';
      this.trainer.hide();
    } else if(this.state == 'show') {
      this.pickDiv.style.display = 'none';
      this.newDiv.style.display = 'block';
      this.trainer.show();
    }
  }

  update(mean, sd, silence) {
    this.trainer.updateParams(mean,sd, silence);
    this.innerUpdate();
  }
}
