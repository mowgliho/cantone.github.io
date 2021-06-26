class MonoListener {
  static sounds = ['fan','fu','haam','ham','hau','hon','jam','jan','jau','ji','jim','jin','jing','jiu','joeng','jung','jyu','jyun','se','seoi','seon','si','sin','soeng','syu','syun','wai','wan'];
  static tones = ['1','2','3','4','5','6'];
  states = ['chillin','playin'];

  transcriptionDiv;
  buttons;

  //state
  state;
  sound;

  constructor(document) {
    const that = this;
    const div = document.getElementById("div-listen-mono");
    this.transcriptionDiv = document.createElement('div');
    this.transcriptionDiv.style.display = 'inline-block';
    div.appendChild(this.transcriptionDiv);
    const nextButton = document.createElement('button');
    nextButton.onclick = function() { that.next();}
    nextButton.innerHTML = 'new sound';
    nextButton.style.display = 'inline-block';
    div.appendChild(nextButton);
    this.buttons = {}
    for(const tone of MonoListener.tones) {
      const button = document.createElement('button');
      button.className = 'pretty-button';
      button.style.display = 'block';
      button.innerHTML = 'Tone ' + tone;
      button.onclick = function() { that.play(tone)};
      div.appendChild(button);
      this.buttons[tone] = button;
    }
    this.state = 'chillin';
    this.next();
  }

  //Note: https://dev.to/dengel29/loading-local-files-in-firefox-and-chrome-m9f
  play(tone) {
    const that = this;
    if(this.state == 'chillin') {
      this.state = 'playin';
      var audio = new Audio('wav/humanum/' + this.sound + tone + '.wav');
      const button = this.buttons[tone];
      button.style.backgroundColor = 'LawnGreen';
      audio.onended = function() { 
        button.style.backgroundColor = '';
        that.state = 'chillin';
      };
      audio.play();
    }
  }

  next() {
    this.sound = MonoListener.sounds[Math.floor(Math.random() * WangListener.sounds.length)];
    this.transcriptionDiv.innerHTML = "Tones for " + this.sound;
  }
}
