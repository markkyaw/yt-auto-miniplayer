(function () {
  'use strict';

  const settings = globalThis.YtAmp.settings;
  const toggle = document.getElementById('toggle');

  settings.load().then(function (enabled) {
    toggle.checked = enabled;
  });

  toggle.addEventListener('change', function () {
    settings.save(toggle.checked);
  });
})();
