class WorldAudioProducer {
  static humanumMean = 38.1//in semitones
  static worldJSSpeed = 16;
  timeouts;
  world;
  audioBuffers;
  audioCtx;

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

  constructor(trainer) {
    const that = this;
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

  loadCharacter(char) {
    const that = this;

    this.audioBuffers = {};
    this.audioLoaded = false;
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
    const f0 = WorldAudioProducer.semitoneArrayToFreq(WorldAudioProducer.freqArrayToSemitone(this.f0, shift));
    this.synth['char'] = WorldAudioProducer.float64To32(this.world.Synthesis(f0, this.spectral, this.aperiodicity, this.fft_size, this.sampleRate, WorldAudioProducer.worldJSSpeed));
    this.trainer.updateVocoderStatus('Vocoded to your vocal range: ', true);
  }

  getCharAudio(audioCtx) {
    const node = audioCtx.createBufferSource();
    const samples = this.synth['char']
    var nodeBuffer = audioCtx.createBuffer(1, samples.length, this.sampleRate);
    nodeBuffer.copyToChannel(samples,0);
    node.buffer = nodeBuffer;
    const duration = samples.length/this.sampleRate;
    return [node,duration];
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
