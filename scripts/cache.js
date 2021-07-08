class Cache {
  //class variables
  SENTENCES = {
    vol: {v0:'(Don\'t say anything: this is to calibrate for silence)'},
    freq: {
      h0:'Stop whistling and watch the boys march.',
      h1:'Jerk the cord and out tumbles the gold.',
      h2:'Slide the tray across the glass top.',
      h3:'The cloud moved in a stately way and was gone.',
      h4:'Light maple makes for a swell room.',
      h5:'Set the piece here and say nothing.',
      h6:'Dull stories make her laugh.',
      h7:'A stiff cord will do to fasten your shoe.',
      h8:'Get the trust fund to the bank early.',
      h9:'Choose between the high road and the low.'
    }
  };
  DELIMITER = ';';


  constructor() {
  }

  getSentences = () => {
    return this.SENTENCES;
  }

  readCache = () => {
    return {
      mean: parseFloat(localStorage.getItem('mean')),
      sd: parseFloat(localStorage.getItem('sd')),
      n: parseInt(localStorage.getItem('n')),
      silence: parseFloat(localStorage.getItem('silence')),
      sent: this.readSpokenSentences()
    }
  }

  readSpokenSentences = () => {
    var stored = localStorage.getItem('sent');
    var spokenSentences = {freq:[],vol:[]};
    if(stored == null) {
    } else {
      for(const sent of stored.split(this.DELIMITER)) {
        if(sent in this.SENTENCES['freq']) spokenSentences['freq'].push(sent);
        if(sent in this.SENTENCES['vol']) spokenSentences['vol'].push(sent);
      }
    }
   return spokenSentences;
  }

  writeCache = (data) => {
    for(var [key,value] of Object.entries(data)) {
      if(key == 'sent') {
        var val = ''
        for(const v of Object.values(value)) {
          if(val != '') val += this.DELIMITER;
          val += v.join(this.DELIMITER)
        }
        value = val;
      }
      localStorage.setItem(key, value)
    }
  }

  clearCache = () => {
    for(const [key,value] of Object.entries(this.readCache())) {
      localStorage.removeItem(key);
    }
  }
}
