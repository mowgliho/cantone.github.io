class Listener {
  tones = ['1','2','3','4','5','6']
  transcriptionDiv;

  constructor(document, startAudio, cache) {
    const that = this;
    this.transcriptionDiv = document.getElementById("listen-transcription");
    document.getElementById("listen-play-button").onclick = startAudio(
      function(audioContext,stream) {
        that.play(audioContext, stream);
      }
    );
  }

  activate() {
    this.update();
  }

  update() {
  }

  //Note: https://dev.to/dengel29/loading-local-files-in-firefox-and-chrome-m9f
  play(audioContext, stream) {
    var toneOrder = Listener.shuffle(this.tones);
    this.transcriptionDiv.innerHTML = '';
    const divs = {}
    for(const tone of toneOrder) {
      let div = document.createElement('div');
      div.innerHTML = tone;
      div.style = 'display:inline-block;';
      this.transcriptionDiv.appendChild(div);
      divs[tone] = div;
    }
    this.playTones(divs, toneOrder);
  }

  playTones(divs, tones) {
    if(tones.length == 0) return;
    const tone = tones[0]
    const that = this;
    //color divs
    for(const [key,val] of Object.entries(divs)) {
      if(key == tone) val.style = 'display:inline-block;color:red;'
      else val.style = 'display:inline-block;color:black;'
    }
    //play audio
    var audio = new Audio('wav/humanum/si' + tone + '.wav');
    audio.onended = function() { that.playTones(divs, tones.slice(1))};
    audio.play();
  }

  static shuffle(array) {
    var idx = array.length,  randomIndex;
    while (0 !== idx) {
      // Pick a remaining element...
      const rIdx = Math.floor(Math.random() * idx);
      idx--;

      // And swap it with the current element.
      [array[idx], array[rIdx]] = [
        array[rIdx], array[idx]];
    }
    return array;
  }
}
