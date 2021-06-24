class Listener {
  //general
  modes = [null,'mono','wang','match','phrase'];
  listeners;
  divs;

  //state
  mode;




  transcriptionDiv;

  constructor(document, startAudio) {
    const that = this;

    this.listeners = {
      null: null,
      mono: new MonoListener(document),
      wang: new WangListener(document),
      match: null,
      phrase: null
    }

    this.divs = {}
    for(const mode of this.modes) {
      if(mode != null) this.divs[mode] = document.getElementById('div-listen-' + mode);
    }

    //connect up all modes to functionality
    this.mode = null;
    for(const mode of this.modes) {
      if(mode != null) document.getElementById('listen-mode-' + mode).onclick = function() { that.mode = mode; that.update();};
    }

    this.update();
  }

  activate() {
    this.update();
  }

  update() {
    //show correct div
    for(const m of this.modes) {
      if(m == null) {
      } else if(m == this.mode) {
        this.divs[m].style = 'display:block;';
      } else {
        this.divs[m].style = 'display:none;';
      }
    }
  }
}
