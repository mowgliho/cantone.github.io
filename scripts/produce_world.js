class WorldAudioProducer {
  static humanumMean = 38.1//in semitones
  static worldJSSpeed = 16;
  static checked = ['p','t','k'];
  static cutpoints = {checked:{start:0.5,end:0.5},normal:{start:0.2,end:0.8}};
  static apThreshold = 0.5
  static minApBand = 5;
  static spectralTuneWidth = 0.1;
  //from looking at humanum data
  static tuneSts = {
    start:{'1':45, '2':35,'3':40,'4':37,'5':34,'6':37},
    end:{'1':45, '2':42.5,'3':40,'4':29,'5':37.5,'6':35}
  }

  timeouts;
  world;
  audioBuffers;
  audioCtx;
  tuningDuration;

  audioLoaded;
  f0;
  spectral;
  aperiodicity;
  fft_size;
  sampleRate;
  synth;//the synthetic audio files (as buffers);

  //to be updated
  mean;
  sd;

  constructor(trainer, tuningDuration) {
    const that = this;

    this.tuningDuration = tuningDuration;
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    this.audioBuffers = {};

    this.timeouts = [];
    this.timeouts.push(setInterval(function() {that.activate()},100));

    this.audioLoaded = false;
    this.mean = null;
    this.sd = null;
    this.trainer = trainer;
  } 

  activate() {
    if(Object.keys(Module).includes('WorldJS')) {
      this.world = Module.WorldJS
      this.clearTimeouts();
    }
  }

  loadCharacter(char, tone) {
    const that = this;

    this.audioBuffers = {};
    this.audioLoaded = false;
    this.tone = tone;
    this.char = char.slice(0,-1);
    const url = CONFIG['WorldFilePrefix'] + char + '.wav'
    const req = new XMLHttpRequest();
    req.open('GET', url);
    req.responseType = 'arraybuffer';
    req.onload = function(e) {that.loadAudio(req.response)};
    req.send();
  }

  loadAudio(arraybuffer) {
    const that = this;

    this.audioCtx.decodeAudioData(arraybuffer).then(function(audio) {
      that.trainer.updateVocoderStatus('Vocoder: Analyzing Audio',false);
      that.sampleRate = audio.sampleRate;
      var buffer = audio.getChannelData(0);//note that we assume single channel
      const f0 = that.world.Dio(buffer, that.sampleRate, WorldAudioProducer.worldJSSpeed);
      const sp = that.world.CheapTrick(buffer, f0.f0, f0.time_axis, that.sampleRate);
      const ap = that.world.D4C(buffer, f0.f0, f0.time_axis, sp.fft_size, that.sampleRate);
      that.f0 = f0.f0;
      that.spectral = sp.spectral;
      that.aperiodicity = ap.aperiodicity;
      that.fft_size = sp.fft_size;
      that.audioLoaded = true;
      that.synthesizeAudio();
    });
  }

  synthesizeAudio() {
    if(!this.audioLoaded || this.mean == null || this.sd == null) {
      this.trainer.updateVocoderStatus('al: ' + this.audioLoaded + ' mean: ' + this.mean + ' sd: ' + this.sd,false);
      return;
    }
    this.trainer.updateVocoderStatus('Vocoder: Synthesizing Audio',false);
    this.synth = {};
    //shift for whole syllable
    const shift = this.mean - WorldAudioProducer.humanumMean;
    const charf0 = WorldAudioProducer.semitoneArrayToFreq(WorldAudioProducer.freqArrayToSemitone(this.f0, shift));
    this.synth['char'] = WorldAudioProducer.float64To32(this.world.Synthesis(charf0, this.spectral, this.aperiodicity, this.fft_size, this.sampleRate, WorldAudioProducer.worldJSSpeed));
    //beginning elements
    const [voiceStart,voiceEnd] = this.getVoicedIndices(this.aperiodicity);
    const cutpoints = WorldAudioProducer.cutpoints[WorldAudioProducer.checked.includes(this.char.slice(-1))?'checked':'normal'];
    for(const [type, point] of Object.entries(cutpoints)) {
      //get indices
      const midIdx = voiceStart + (point)*(voiceEnd - voiceStart)
      const startIdx = Math.ceil(midIdx - (WorldAudioProducer.spectralTuneWidth/2)*(voiceEnd-voiceStart));
      const endIdx = Math.floor(midIdx + (WorldAudioProducer.spectralTuneWidth/2)*(voiceEnd-voiceStart));
      //get the desired spectrum, aperiodicty, f0
      const spectrum = this.getMedians(this.spectral.slice(startIdx, endIdx));
      const aperiodicity = this.getMedians(this.aperiodicity.slice(startIdx, endIdx));
      const f0 = WorldAudioProducer.semitoneToFreq(WorldAudioProducer.tuneSts[type][this.tone] + shift);
      //repeat for desired length
      const indicesPerSecond = this.f0.length/(this.synth['char'].length/this.sampleRate);
      const numInds = Math.max(1,Math.round(indicesPerSecond*this.tuningDuration));
      const spectra = this.duplicate(spectrum, numInds);
      const aperioda = this.duplicate(aperiodicity, numInds);
      const f0s = this.duplicate(f0, numInds);
      this.synth[type] = WorldAudioProducer.float64To32(this.world.Synthesis(f0s, spectra, aperioda, this.fft_size, this.sampleRate, WorldAudioProducer.worldJSSpeed));
    }
    this.trainer.updateVocoderStatus('Vocoded to your vocal range: ', true);
  }

  duplicate(x, n) {
    const ret = [];
    for(var i = 0; i < n; i++) {
      ret.push(x);
    }
    return ret;
  }

  getMedians(spectra) {
    const ret = new Float64Array(spectra[0].length);
    for(var i = 0; i < ret.length; i++) {
      const vals = new Float64Array(spectra.length);
      for(var j = 0; j < vals.length; j++) {
        vals[j] = spectra[j][i]
      }
      ret[i] = this.getMedian(vals);
    }
    return ret;
  }

  getMedian(values){
    if(values.length == 0) return 0;
    values.sort(function(a,b){
      return a-b;
    });
    var half = Math.floor(values.length / 2);
    if (values.length % 2) return values[half];
    return (values[half - 1] + values[half]) / 2.0;
  }

  //checks if first 10th of fft buckets are below 0.5
  getVoicedIndices(aperiodicity) {
    const apBuckets = [];
    for(var j = 0; j < this.spectral.length; j++) {
      apBuckets.push(this.getMedian(aperiodicity[j].slice(0,Math.floor(aperiodicity[j].length/10))))
    }
    var start = null;
    var end = null;
    var startCount = 0;
    var endCount = 0;
    for(var i = 0; i < apBuckets.length; i++) {
      if(start == null) {
        if(apBuckets[i] < WorldAudioProducer.apThreshold) startCount += 1;
        else startCount = 0;
        if(startCount >= WorldAudioProducer.minApBand) start = i - WorldAudioProducer.minApBand + 1;
      }
      if(end == null) {
        if(apBuckets[apBuckets.length-i] < WorldAudioProducer.apThreshold) endCount += 1;
        else endCount = 0;
        if(endCount >= WorldAudioProducer.minApBand) end = (apBuckets.length-i) + WorldAudioProducer.minApBand - 1;
      }
    }
    if(start == null || end == null || end <= start) {
      start = Math.floor(apBuckets.length/2);
      end = Math.ceil(apBuckets.length/2);
    }
    return [start,end];
  }

  getCharAudio(audioCtx, type) {
    const node = audioCtx.createBufferSource();
    const samples = this.synth[type]
    var nodeBuffer = audioCtx.createBuffer(1, samples.length, this.sampleRate);
    nodeBuffer.copyToChannel(samples,0);
    node.buffer = nodeBuffer;
    const duration = samples.length/this.sampleRate;
    return [node,duration];
  }

  //as in Zhang 2018, use middle 80% (tone/nucleus as in Yang)
  //Tone contour begins and ends at syllable (Xu), so we adjust accordingly based on the tone
  //for checked tones (ptk at end), we use the middle (they are level tones and mostly short): checked that all characters with 'p', 't', and 'k' at the end are indeed t1,3,6
  //We get start/end differences from humanum
  getTuningAudio(audioCtx) {

  }

  clearTimeouts() {
    for(const timeout of this.timeouts) {
      clearTimeout(timeout);
    }
    this.timeouts = [];
  }

  update(mean, sd) {
    this.mean = mean;
    this.sd = sd;
    this.synthesizeAudio();
  }

  static float64To32(array) {
    var ret = new Float32Array(array.length);
    for(var i = 0; i < array.length; i++) {
      ret[i] = Math.fround(array[i]);
    }
    return ret;
  }

  static semitoneArrayToFreq(st) {
    const ret = new Array(st.length);
    for(var i = 0; i < st.length; i++) {
      ret[i] = WorldAudioProducer.semitoneToFreq(st[i]);
    }
    return ret;
  }

  static semitoneToFreq(st) {
    return Math.pow(2,(st - 49)/12)*440;
  }

  static freqArrayToSemitone(freq, shift) {//shift in semitones
    const ret = new Array(freq.length);
    for(var i = 0; i < freq.length; i++) {
      ret[i] = WorldAudioProducer.freqToSemitone(freq[i]) + shift;
    }
    return ret;
  }

  static freqToSemitone(freq) {
    return Math.log2(freq/440)*12 + 49;
  }
}
