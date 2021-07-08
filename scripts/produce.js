class Producer {
  static minVol = Math.pow(0.5,3)//don't want to be too loud

  producer;

  //divs
  calibrationDiv;
  trainDiv;

  cache;

  constructor(document, startAudio, cache) {
    const that = this;
    this.calibrationDiv = document.getElementById("div-produce-calib");
    this.trainDiv = document.getElementById("div-produce-train");
    this.producer = new ProtoProducer(document, startAudio, this.trainDiv);
    this.cache = cache;

    this.update();
  }

  activate() {
    this.update();
  }

  //the all-important function
  update() {
    //read cache
    let cached = this.cache.readCache();
    //if no cache, turn off window
    if(cached['n'] == null || cached['sent']['freq'].length == null || cached['n'] == 0 || cached['sent']['freq'].length == 0 || isNaN(cached['silence']) || cached['silence'] > Producer.minVol) {
      this.calibrationDiv.innerHTML = "Haven't calibrated yet or too much ambient noise";
      this.trainDiv.style = "display:none;";
    } else {//if cache, store cached values
      this.calibrationDiv.innerHTML = "Calibrated with mean of " + cached['mean'].toFixed(2) + ' and sd of ' + cached['sd'].toFixed(2) + '. Silence has been calibrated to ' + cached['silence'].toFixed(2) + '<br>';
      this.trainDiv.style = "display:block;";
      this.producer.update(cached['mean'], cached['sd'], cached['silence']);
    }
  }
}
