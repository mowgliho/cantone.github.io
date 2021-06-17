function initializeModeSwitcher(document) {
  let modes = ['calib','graph','produce','listen']
  let data = {}

  activateMode = function(m) {
    for(const [key,value] of Object.entries(data)) {
      if(key == m) {
        value.style.display = 'block';
      } else {
        value.style.display = 'none';
      }
    }
  }

  for(const mode of modes) {
      console.log(mode)
      data[mode] = document.getElementById("div-" + mode);
      document.getElementById("mode-" + mode).onclick = function() { activateMode(mode)}
  }
}

