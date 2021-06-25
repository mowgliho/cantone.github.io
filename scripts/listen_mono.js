class MonoListener {
  static sounds = ['fan','fu','haam','ham','hau','hon','jam','jan','jau','ji','jim','jin','jing','jiu','joeng','jung','jyu','jyun','se','seoi','seon','si','sin','soeng','syu','syun','wai','wan']

  transcriptionDiv;
  sound;

  constructor(document) {
    const that = this;
    this.transcriptionDiv = document.getElementById("listen-mono-transcription");
    document.getElementById("listen-mono-button").onclick = function() { that.play();}
  }

  //Note: https://dev.to/dengel29/loading-local-files-in-firefox-and-chrome-m9f
  play() {
    this.sound = WangListener.sounds[Math.floor(Math.random() * WangListener.sounds.length)];
    var toneOrder = MonoListener.shuffle(MonoListener.tones);
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
    var audio = new Audio('wav/humanum/' + this.sound +  tone + '.wav');
    audio.onended = function() { that.playTones(divs, tones.slice(1))};
    audio.play();
  }

  static tones = ['1','2','3','4','5','6']
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
