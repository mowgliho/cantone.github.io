class Producer {
  //modes
  modes = [null,'ideal','data','ta'];
  producers;

  //divs
  calibrationDiv;
  trainDiv;

  cache;

  //state
  mode;

  //helper variables
  mean;
  sd;

  constructor(document, startAudio, cache) {
    const that = this;
    this.calibrationDiv = document.getElementById("div-produce-calib");
    this.trainDiv = document.getElementById("div-produce-train");
    this.cache = cache;


    this.producers = {
      null: null,
      ideal: new IdealProducer(document, startAudio),
      data: null,
      ta: null
    }

    //connect up all modes to functionality
    this.mode = null;
    for(const mode of this.modes) {
      if(mode != null) document.getElementById('produce-mode-' + mode).onclick = function() { that.mode = mode; that.update();};
    }

    this.update();
  }

  activate() {
    this.update();
  }

  //the all-important function
  update() {
    //show correct div
    for(const m of this.modes) {
      if(m == null) {
      } else if(m == this.mode) {
        document.getElementById('div-produce-' + m).style = 'display:block;';
      } else {
        document.getElementById('div-produce-' + m).style = 'display:none;';
      }
    }
    //read cache
    let cached = this.cache.readCache();
    //if no cache, turn off window
    if(cached['n'] == null || cached['sent'].length == null || cached['n'] == 0 || cached['sent'].length == 0) {
      this.calibrationDiv.innerHTML = "Haven't calibrated yet";
      this.trainDiv.style = "display:none;";
      this.calibrated = false;
    } else {//if cache, store cached values
      this.mean = cached['mean'];
      this.sd = cached['sd'];
      this.calibrationDiv.innerHTML = "Calibrated with mean of " + cached['mean'].toFixed(2) + ' and sd of ' + cached['sd'].toFixed(2) + '<br>';
      this.trainDiv.style = "display:block;";
      this.calibrated = true;
      if(this.producers[this.mode] != null) {
        this.producers[this.mode].update(this.mean, this.sd);
      }
    }
  }
}

