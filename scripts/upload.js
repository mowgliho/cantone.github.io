class Uploader {
  static time = 1000;
  static filename = 'audio.wav';

  rec;

  constructor(document, startAudio) {
    const that = this;

    this.clicked = false;

    const div = document.getElementById('div-upload');
    const button = document.createElement('button');
    button.innerHTML = 'Record!'
    button.onclick = startAudio(function(audioContext, stream) { 
      if(!that.clicked) {
        that.clicked = true;
        that.record(audioContext, stream);
      }
    });
    div.appendChild(button);
  }

  activate() {
  }

  record(audioContext, stream) {
    const that = this;

    const input = audioContext.createMediaStreamSource(stream);
    this.rec = new Recorder(input, {numChannels: 1});
    this.rec.record();
    console.log('recording started');
    setTimeout(function() {that.stop()}, Uploader.time);
  }

  stop() {
    console.log('recording stopped');
    this.rec.stop();
    this.rec.exportWAV(this.createDownloadLink);
  }

  //to do this, need to do .htaccess for CORS stuff on server. Also for edinburgh chmod 700 the cgi and chmod 777 the .htaccess
  createDownloadLink(blob) {
    var fd = new FormData();
    fd.append('audio_data',blob,Uploader.filename);
    fetch(CONFIG.FileUploadCgi, { method: 'POST', body: fd}).then(
      (response) => {console.log(response)}).catch(
      (error) => {console.log("error", error)});
  }

}
