//generate sounds via pure tones. Do Chao tones for contours
//takes stuff up an octave if the mean is below a threshold (mean because want the system to be consistent within itself)
// to do the cutoff, we note that we will hardcode :( the sd to be 
//   Humanum is a bit exagerrated, has sd of 5.20
//   From our analysis of spice, we have about 4-8, but varies.
//    found the sd of english to be the best predictor of sd of canto
//    but if we implement, the calibration are in monotone
//    also the sd could be more from utterance to utterance: and not within a sentence or something
//    should look at f0 in spice of utterances, get a model of mean to sd perhaps TODO
//    for now, we take from Yang's book (although for Mandarin): mean 215.68, sd 43.82: approx in st (although biased): 3.2
//    also evidence that it's best to normalize based off a window (paper with Canto SVMs) that is dynamic

class ChaoAudioProducer {
  static tones = {
    '1':[5,5],
    '2':[2,5],
    '3':[3,3],
    '4':[2,1],
    '5':[2,3],
    '6':[2,2]
  }
  static sd = 3.2;
  static meanCutoff = 30.37 + ChaoAudioProducer.sd//mean will be chao tone 3, we go down two sds (but only for tone 4, so let's cut at going down one sd), 30.37 is 150hz, where starts to be hard to hear
  static taperLength = 0.1;

  static shift(mean) {
    var shift = 0;
    while(mean + 12*shift < ChaoAudioProducer.meanCutoff) {
      shift += 1;
    }
    return(shift);
  }

  //for the chao producer, we only look at mean and tone
  static adjustedTone(audioContext, char, tone, mean, sd, duration) {
    const start = ChaoAudioProducer.getShiftedSt(tone, mean, sd, true);
    const end = ChaoAudioProducer.getShiftedSt(tone, mean, sd, false);

    return(ChaoAudioProducer.createNode(audioContext, start, end, duration));
  }

  //for the chao producer, we only look at mean and tone
  static guideTone(audioContext, char, tone, mean, sd, start, duration) {
    const st = ChaoAudioProducer.getShiftedSt(tone, mean, sd, start);
    return(ChaoAudioProducer.createNode(audioContext, st, st, duration));
  }

  static createNode(audioContext, startSt, endSt, duration) {
    const sampleRate = audioContext.sampleRate;
    // define guidetone
    const node = audioContext.createBufferSource();
    var buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    var bufferData = buffer.getChannelData(0);
    ChaoAudioProducer.fillContourArray(bufferData, sampleRate, startSt, endSt);
    node.buffer = buffer;
    return(node);
  }

  //taper in and out over 0.1s
  //does linear interpolation (in log space!)
  static fillContourArray(array, sampleRate, startSt, endSt) {
    const len = array.length;
    var phase = 0;
    for(var i = 0; i < len; i++) {
      const st = ((len - i)/len) * startSt + (i/len) * endSt;
      const freq = Math.pow(2,(st - 49)/12)*440;
      phase += 2 * Math.PI * freq / sampleRate;
      const amplitude = Math.min(
        Math.min(1,i/(ChaoAudioProducer.taperLength*sampleRate)),
        (len - i)/(ChaoAudioProducer.taperLength*sampleRate)
      );
      array[i] = amplitude * Math.sin(phase);
    }
  }

  static getShiftedSt(tone, mean, sd, start) {
    const shift = ChaoAudioProducer.shift(mean)*12;
    return(ChaoAudioProducer.getSt(tone, mean, sd, start) + shift);
  }

  static getSt(tone, mean, sd, start) {
    return(mean + (ChaoAudioProducer.getCitation(tone, start)*ChaoAudioProducer.sd));
  }

  static getCitation(tone, start) {
    return(ChaoAudioProducer.tones[tone][start?0:1]-3);
  }

  //returns value in sts
  static getToneContour(tone, mean, sd) {
    return([[0,ChaoAudioProducer.getSt(tone, mean, sd, true)], [1,ChaoAudioProducer.getSt(tone,mean,sd,false)]]);
  }
}
