class Cache {
  //class variables
  HARVARDSENTENCES = {
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
  };
  DELIMITER = ';';


  constructor() {
  }

  getSentences = () => {
    return this.HARVARDSENTENCES;
  }

  readCache = () => {
    return {
      mean: parseFloat(localStorage.getItem('mean')),
      sd: parseFloat(localStorage.getItem('sd')),
      n: parseInt(localStorage.getItem('n')),
      sent: this.readSpokenSentences()
    }
  }

  readSpokenSentences = () => {
    var stored = localStorage.getItem('sent');
    var spokenSentences = [];
    if(stored == null) {
    } else {
      for(const sent of stored.split(this.DELIMITER)) {
        if(sent in this.HARVARDSENTENCES) spokenSentences.push(sent);
      }
    }
   return spokenSentences;
  }

  writeCache = (data) => {
    for(var [key,value] of Object.entries(data)) {
      if(key == 'sent') {
        value = value.join(this.DELIMITER)
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
