class Producer {
  //set by constructor
  calibrationDiv;
  
  //updated
  mean;
  sd;

  constructor(document, startAudio, cache) {
    this.calibrationDiv = document.getElementById("div-produce-calib");
    this.trainDiv = document.getElementById("div-produce-train");
    this.cache = cache;
    this.update();
  }

  activate() {
    console.log('pr');
    this.update();
  }

  update() {
    let cached = this.cache.readCache();
    if(cached['n'] == null || cached['sent'].length == null || cached['n'] == 0 || cached['sent'].length == 0) {
      this.calibrationDiv.innerHTML = "Haven't calibrated yet";
      this.trainDiv.style = "display:none;";
    } else {
      this.calibrationDiv.innerHTML = "calibrated yet";
      this.trainDiv.style = "display:block;";
    }
    console.log(cached);
  }
}
