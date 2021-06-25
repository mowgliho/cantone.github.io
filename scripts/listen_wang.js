/*
Adapts the perception program of Wang 1999
+ Train in pairs, from easiest to most difficult
  + mandarin has 4C2 = 6 pairs, while cantonese has 6C2 = 15 pairs
+ each pair trained with $n$ trials (Wang used 30)
  + each trial is two-alternative forced-choice identification
    + start with 500Hz pure tone
    + stimuli (e.g. bei3)
    + trainee response (e.g. b/t bei3 and bei4): within 2 seconds
    + English voice: That was tone 3:
    + stimuli (bei3 again)
    + English voice: Tone 4 is:
    + stimuli (bei4)
  + 5s between trials
+ break after each pair

We have 15 pairs. If we each trial takes 10s, then if we train for 15 minutes (900s), then we can have 6 examples per pair of tones.
+ review previous pairs? After all, new learners and all that
+ Pairs: take English pretest confusion matrix from Francis 2008 (Table 3), sum for each pair (lee 1995 also has a confusion matrix, but it's for a ML system so irrelevant)
    read_tsv('data/confusion/francis_english_pretest.tsv') %>% 
      pivot_longer(cols=t4:t1,names_to = "tone2", values_to = 'confusion') %>% 
      filter(tone1 != tone2) %>% 
      mutate(tones = ifelse(tone1<tone2,paste0(tone1,tone2),paste0(tone2,tone1))) %>% 
      group_by(tones) %>% 
        summarize(confusion = sum(confusion), n = n()) %>% 
      arrange(confusion)

       tones confusion     n
       <chr>     <dbl> <int>
     1 t1t2      0         2
     2 t1t4      0         2
     3 t1t6      0         2
     4 t2t4      0         2
     5 t2t6      0         2
     6 t2t3      0.01      2
     7 t1t5      0.02      2
     8 t3t4      0.03      2
     9 t2t5      0.08      2
    10 t4t5      0.11      2
    11 t5t6      0.140     2
    12 t1t3      0.15      2
    13 t3t5      0.35      2
    14 t4t6      0.53      2
    15 t3t6      0.62      2
+ should have different pairs for mandarin speakers? (i.e. mandarin pretest)

To keep things simple, we won't cache progress: and just go in order every time.
*/

class WangListener {
  static sounds = ['fan','fu','haam','ham','hau','hon','jam','jan','jau','ji','jim','jin','jing','jiu','joeng','jung','jyu','jyun','se','seoi','seon','si','sin','soeng','syu','syun','wai','wan']
  static tones = [1,2,3,4,5,6];
  static iterationsPerPair = 2;
  static pairOrder = [
    [1,2],[1,4],[1,6],[2,4],[2,6],
    [2,3],[1,5],[3,4],[2,5],[4,5],
    [5,6],[1,3],[3,5],[4,6],[3,6]
  ];
  static playAudio(f, fn) {
    var audio = new Audio(fn);
    audio.onended = f;
    audio.play();
  }


//  states = ['playing', 'start', 'pick', 'correct', 'other', 'next'];

  //divs and gui stuff
  trainDiv;
  doneDiv;
  buttons;
  playButton;
  nextButton;
  text;

  //training state
  pair;
  iteration;
  done;

  //cur state
  startTone;
  otherTone;
  state;

  constructor(document) {
    const that = this;

    this.text = document.getElementById('div-listen-wang-text');
    this.buttons = {}
    const buttonDiv = document.getElementById("div-listen-wang-buttons");
    for(const tone of WangListener.tones) {
      const button = document.createElement('button');
      button.className = 'wang-button';
      button.innerHTML = 'Tone ' + tone;
      buttonDiv.appendChild(button);
      button.onclick = function() {that.click(tone)};
      this.buttons[tone] = button;
    }
    this.playButton = document.getElementById("listen-wang-play-button");
    this.playButton.onclick = function() {that.play()};
    this.nextButton = document.getElementById('listen-wang-next')
    this.nextButton.onclick = function() { that.nextTrial(); };

    this.trainDiv = document.getElementById('div-listen-wang-train');
    this.doneDiv = document.getElementById('div-listen-wang-done');

    this.initialize();
    this.update();
  }

  click(tone) {
    if(this.state == 'pick') {
      this.picked = tone;
      this.state = 'correct';
      this.update();
    }
  }

  pick(button) {
    if(this.state == 'pick') {
      const guess = (button == 'left'? this.pickLeft: this.pickRight).innerHTML.slice(-1);
      this.correct = guess == this.startTone;
      this.state = 'correct';
    }
    this.update();
  }

  play() {
    const that = this;
    if(this.state == 'start') {
      this.state = 'playing';
      WangListener.playAudio(function() {that.state = 'pick'; that.update(); }, 'wav/humanum/' + this.sound + this.startTone + '.wav');
    } else if(this.state == 'correct') {
      this.state = 'playing';
      WangListener.playAudio(function() {that.state = 'other'; that.update(); }, 'wav/humanum/' + this.sound + this.startTone + '.wav');
    } else if(this.state == 'other') {
      this.state = 'playing';
      WangListener.playAudio(function() {that.state = 'next'; that.update(); }, 'wav/humanum/' + this.sound + this.otherTone + '.wav');
    }
    this.update();
  }

  update() {
    if(this.done) {
      this.trainDiv.style = 'display:none;';
      this.doneDiv.style = 'display:block;';
    } else {
      this.doneDiv.style = 'display:none;';
      this.trainDiv.style = 'display:block;';
      if(this.state == 'start') {
        this.text.innerHTML = "What tone is this?"
        this.text.style.color = "black";
        for(const button of Object.values(this.buttons)) {
          button.style.opacity = 1;
          button.style.backgroundColor = '';
        }
        this.playButton.innerHTML = 'Play!';
        this.playButton.style.visibility = 'visible';
        this.nextButton.style.visibility = 'hidden';
      } else if(this.state == 'pick') {
        for(const [tone, button] of Object.entries(this.buttons)) {
          if(this.pair.includes(parseInt(tone))) {
          } else {
            button.style.opacity = 0.4;
          }
        }
        this.playButton.style.visibility = 'hidden';
      } else if(this.state == 'correct') {
        const correct = this.picked == this.startTone;
        this.text.innerHTML = "That was tone " + this.startTone;
        this.text.style.color = correct?'Green':'Red';
        for(const tone of this.pair) {
          if(tone == this.startTone) this.buttons[tone].style.backgroundColor = 'LawnGreen';
          else if(tone == this.picked) this.buttons[tone].style.backgroundColor = 'Red';
        }
        this.playButton.innerHTML = 'Play Tone ' + this.startTone + ' Again';
        this.playButton.style.visibility = 'visible';
      } else if(this.state == 'other') {
        this.text.innerHTML = "Tone " + this.otherTone + " sounds like:"
        this.text.style.color = "black";
        this.playButton.innerHTML = "Play Tone " + this.otherTone;
        this.playButton.style.visibility = 'visible';
      } else if(this.state == 'next') {
        this.playButton.style.visibility = 'hidden';
        this.nextButton.style.visibility = 'visible';
      }
    }
  }

  initialize() {
    this.done = false;
    this.pair = WangListener.pairOrder[0];
    this.iteration = 0;
    this.nextTrial();
  }

  //sets up to play next pair
  nextTrial() {
    if(this.iteration != WangListener.iterationsPerPair) {
      this.done = false;
      this.iteration += 1;

    } else {
      var idx = 0;
      for(const pair of WangListener.pairOrder) {
        if(this.pair == pair) break;
        idx += 1
      }
      if(idx == WangListener.pairOrder.length - 1) {
        this.done = true;
        this.state = null;
        this.iteration = 1;
      } else {
        this.done = false;
        this.pair = WangListener.pairOrder[idx+1]
        this.iteration = 1;
      }
    }
    if(!this.done) {
      this.state = 'start';
      this.sound = WangListener.sounds[Math.floor(Math.random() * WangListener.sounds.length)];
      const startIdx = Math.floor(Math.random() * 2);
      this.startTone = this.pair[startIdx];
      this.otherTone = this.pair[1-startIdx];
    }
    this.update();
  }
}
