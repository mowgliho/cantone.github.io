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
  static iterationsPerPair = 2;
  static pairOrder = [
    [1,2],[1,4],[1,6],[2,4],[2,6],
    [2,3],[1,5],[3,4],[2,5],[4,5],
    [5,6],[1,3],[3,5],[4,6],[3,6]
  ];

  states = ['start', 'pick', 'correct', 'other', 'next'];//order is important

  //divs and gui stuff
  trainDiv;
  doneDiv;
  divs;
  pickLeft;
  pickRight;
  correctDiv;
  otherDiv;
  playStartButton;

  //training state
  pair;
  iteration;
  done;
  correct;

  //cur state
  startTone;
  otherTone;
  state;

  constructor(document) {
    const that = this;

    //set divs
    this.divs = {};
    for(const state of this.states) {
      this.divs[state] = document.getElementById('div-listen-wang-' + state);
    }
    this.trainDiv = document.getElementById('div-listen-wang-train');
    this.doneDiv = document.getElementById('div-listen-wang-done');
    this.pickLeft = document.getElementById('listen-wang-pick-left');
    this.pickRight = document.getElementById('listen-wang-pick-right');
    this.correctDiv = document.getElementById('div-listen-wang-correct-text');
    this.otherDiv = document.getElementById('div-listen-wang-other-text');
    this.playStartButton = document.getElementById('listen-wang-start-play');
    this.playCorrectButton = document.getElementById('listen-wang-correct-play');
    this.playOtherButton = document.getElementById('listen-wang-other-play');

    //hook up
    document.getElementById('listen-wang-next').onclick = function() { that.nextTrial(); };
    document.getElementById('listen-wang-start-play').onclick = function() { 
      that.playStartButton.style = "display:none;";
      that.playStart(function() {
        that.state = 'pick'
        that.update();
      });
    };
    document.getElementById('listen-wang-pick-left').onclick = function() { that.pick('left');};
    document.getElementById('listen-wang-pick-right').onclick = function() { that.pick('right');};
    document.getElementById('listen-wang-correct-play').onclick = function() { 
      that.playCorrectButton.style = "display:none;";
      that.playStart(function() {
        that.state = 'other';
        that.update();
      });
    };
    document.getElementById('listen-wang-other-play').onclick = function() { 
      that.playOtherButton.style = "display:none;";
      that.playOther(function() {
        that.state = 'next'
        that.update();
      });
    };
    this.initialize();
    this.update();
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
      this.sound = 'si';//TODO change to change sounds around
      const startIdx = Math.floor(Math.random() * 2);
      this.startTone = this.pair[startIdx];
      this.otherTone = this.pair[1-startIdx];
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
      //start div
      if(this.state == 'start') {
        this.playStartButton.style = "display:inline-block;";
        const order = Math.floor(Math.random() * 2);//randomize buttons
        this.pickLeft.innerHTML = 'Tone ' + this.pair[order];
        this.pickRight.innerHTML = 'Tone ' + this.pair[1-order];
      } else if(this.state == 'correct') {
        this.playCorrectButton.style = "display:inline-block;";
        //correct div
        this.correctDiv.innerHTML = 'That was tone ' + this.startTone + '.';
        this.correctDiv.style = 'color:' + (this.correct?'black':'red') + ';display:inline;';
      } else if(this.state == 'other') {
        this.playOtherButton.style = "display:inline-block;";
        this.otherDiv.innerHTML = 'This is tone ' + this.otherTone + '.';
      }
      var before = true;
      //makes all visible up to match
      for(const [state,div] of Object.entries(this.divs)) {
        div.style = before?"display:block;":"display:none";
        if(state == this.state) before = false;;
      }
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

  playStart(f) {
    this.playAudio(f, 'wav/humanum/' + this.sound + this.startTone + '.wav');
  }

  playOther(f) {
    this.playAudio(f, 'wav/humanum/' + this.sound + this.otherTone + '.wav');
  }
  
  playAudio(f, fn) {
    var audio = new Audio(fn);
    audio.onended = f;
    audio.play();
  }
}
