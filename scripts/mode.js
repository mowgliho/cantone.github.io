function initializeModeSwitcher(document, calibrator, producer, listener, uploader) {
  let modes = ['calib','produce','listen','upload'];
  let data = {
    calib: {cl: calibrator},
    produce: {cl:producer},
    listen: {cl:listener},
    upload: {cl:uploader},
  };

  activateMode = function(m) {
    for(const [key,value] of Object.entries(data)) {
      if(key == m) {
        value['div'].style.display = 'block';
        if(value['cl'] != null) value['cl'].activate();
      } else {
        value['div'].style.display = 'none';
      }
    }
  }

  for(const mode of modes) {
      data[mode]['div'] = document.getElementById("div-" + mode);
      document.getElementById("mode-" + mode).onclick = function() { activateMode(mode)}
  }
}
