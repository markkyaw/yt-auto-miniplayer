'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { define } = require('../support/helpers.js');

require('../src/popup.js');
const popup = globalThis.YtAmp.popup;

// Builds a fake checkbox or row.
function fakeControl() {
  return {
    checked: false,
    hidden: false,
    handlers: {},
    addEventListener(type, handler) { this.handlers[type] = handler; }
  };
}

// Builds the three controls the popup owns.
function fakeView() {
  return {
    enabledToggle: fakeControl(),
    backToggle: fakeControl(),
    backRow: fakeControl()
  };
}

// Installs a stub settings module. Returns the saved calls.
function installSettings(values) {
  const saved = [];
  globalThis.YtAmp.settings = {
    load() { return Promise.resolve(values); },
    save(name, value) { saved.push([name, value]); return Promise.resolve(); }
  };
  return saved;
}

test('render copies both values into the checkboxes', () => {
  const view = fakeView();
  popup.render(view, { enabled: true, backOpensMiniplayer: false });
  assert.strictEqual(view.enabledToggle.checked, true);
  assert.strictEqual(view.backToggle.checked, false);
});

test('render shows the back row when the main toggle is on', () => {
  const view = fakeView();
  popup.render(view, { enabled: true, backOpensMiniplayer: true });
  assert.strictEqual(view.backRow.hidden, false);
});

test('render hides the back row when the main toggle is off', () => {
  const view = fakeView();
  popup.render(view, { enabled: false, backOpensMiniplayer: true });
  assert.strictEqual(view.backRow.hidden, true);
});

test('a change on the main toggle saves the key and hides the back row', () => {
  const view = fakeView();
  const saved = installSettings({ enabled: true, backOpensMiniplayer: true });
  popup.arm(view);
  view.enabledToggle.checked = false;
  view.enabledToggle.handlers.change();
  assert.deepStrictEqual(saved, [['enabled', false]]);
  assert.strictEqual(view.backRow.hidden, true);
});

test('a change on the back toggle saves the back key', () => {
  const view = fakeView();
  const saved = installSettings({ enabled: true, backOpensMiniplayer: true });
  popup.arm(view);
  view.backToggle.checked = false;
  view.backToggle.handlers.change();
  assert.deepStrictEqual(saved, [['backOpensMiniplayer', false]]);
});

test('start reads the settings and renders them', async () => {
  const view = fakeView();
  installSettings({ enabled: false, backOpensMiniplayer: true });
  define('document', {
    getElementById(id) {
      if (id === 'toggle') return view.enabledToggle;
      if (id === 'back-toggle') return view.backToggle;
      if (id === 'back-row') return view.backRow;
      return null;
    }
  });
  popup.start();
  assert.strictEqual(view.backToggle.handlers.change, undefined);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.strictEqual(view.enabledToggle.checked, false);
  assert.strictEqual(view.backRow.hidden, true);
  assert.strictEqual(typeof view.backToggle.handlers.change, 'function');
});
