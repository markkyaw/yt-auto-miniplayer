(function (root) {
  'use strict';

  // The back row shows only when the main toggle is on. The seconds
  // field shows only when the back toggle is on.
  function render(view, values) {
    view.enabledToggle.checked = values.enabled;
    view.backToggle.checked = values.backOpensMiniplayer;
    view.secondsField.value = String(values.minimumSeconds);
    view.backRow.hidden = !values.enabled;
    view.secondsRow.hidden = !values.backOpensMiniplayer;
  }

  function arm(view) {
    const settings = root.YtAmp.settings;
    view.enabledToggle.addEventListener('change', function () {
      settings.save('enabled', view.enabledToggle.checked);
      view.backRow.hidden = !view.enabledToggle.checked;
    });
    view.backToggle.addEventListener('change', function () {
      settings.save('backOpensMiniplayer', view.backToggle.checked);
      view.secondsRow.hidden = !view.backToggle.checked;
    });
    view.secondsField.addEventListener('change', function () {
      const seconds = Number(view.secondsField.value);
      // An empty or broken field must not write a broken value.
      if (view.secondsField.value === '' || !Number.isFinite(seconds) || seconds < 0) {
        view.secondsField.value = String(settings.getMinimumSeconds());
        return;
      }
      settings.save('minimumSeconds', seconds);
    });
  }

  function start() {
    const view = {
      enabledToggle: root.document.getElementById('toggle'),
      backToggle: root.document.getElementById('back-toggle'),
      backRow: root.document.getElementById('back-row'),
      secondsField: root.document.getElementById('seconds'),
      secondsRow: root.document.getElementById('seconds-row')
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
