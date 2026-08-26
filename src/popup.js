(function (root) {
  'use strict';

  // The back row shows only when the main toggle is on.
  function render(view, values) {
    view.enabledToggle.checked = values.enabled;
    view.backToggle.checked = values.backOpensMiniplayer;
    view.backRow.hidden = !values.enabled;
  }

  function arm(view) {
    const settings = root.YtAmp.settings;
    view.enabledToggle.addEventListener('change', function () {
      settings.save('enabled', view.enabledToggle.checked);
      view.backRow.hidden = !view.enabledToggle.checked;
    });
    view.backToggle.addEventListener('change', function () {
      settings.save('backOpensMiniplayer', view.backToggle.checked);
    });
  }

  function start() {
    const view = {
      enabledToggle: root.document.getElementById('toggle'),
      backToggle: root.document.getElementById('back-toggle'),
      backRow: root.document.getElementById('back-row')
    };
    // Arm after the load. An early click must not write a default value.
    root.YtAmp.settings.load().then(function (values) {
      render(view, values);
      arm(view);
    });
  }

  root.YtAmp = root.YtAmp || {};
  root.YtAmp.popup = {
    render: render,
    arm: arm,
    start: start
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
