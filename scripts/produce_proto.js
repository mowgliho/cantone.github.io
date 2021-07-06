class ProtoProducer {
  static ANY = 'any';
  pickDiv;
  selectors;

  //state
  state;

  constructor(document, startAudio, div) {
    this.selectors = {};
    this.pickDiv = this.buildPicker(document, div);
    this.updateOptions();
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
    this.char = items[Math.floor(Math.random() * items.length)];
    console.log(this.char);
    //this.state = blah etc.
    this.update();
  }

  update(mean, sd) {
    console.log('updating', mean, sd);
  }
}
