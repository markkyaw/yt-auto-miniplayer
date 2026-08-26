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
    backRow: fakeControl(),
    secondsField: fakeControl(),
    secondsRow: fakeControl()
  };
}

// Installs a stub settings module. Returns the saved calls.
function installSettings(values) {
  const saved = [];
  globalThis.YtAmp.settings = {
    load() { return Promise.resolve(values); },
    getMinimumSeconds() { return values.minimumSeconds; },
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

test('render copies the seconds into the field', () => {
  const view = fakeView();
  popup.render(view, { enabled: true, backOpensMiniplayer: true, minimumSeconds: 12 });
  assert.strictEqual(view.secondsField.value, '12');
});

test('render hides the seconds row when the back toggle is off', () => {
  const view = fakeView();
  popup.render(view, { enabled: true, backOpensMiniplayer: false, minimumSeconds: 5 });
  assert.strictEqual(view.secondsRow.hidden, true);
});

test('render shows the seconds row when the back toggle is on', () => {
  const view = fakeView();
  popup.render(view, { enabled: true, backOpensMiniplayer: true, minimumSeconds: 5 });
  assert.strictEqual(view.secondsRow.hidden, false);
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

test('a change on the back toggle saves the back key and hides the seconds', () => {
  const view = fakeView();
  const saved = installSettings({ enabled: true, backOpensMiniplayer: true });
  popup.arm(view);
  view.backToggle.checked = false;
  view.backToggle.handlers.change();
  assert.deepStrictEqual(saved, [['backOpensMiniplayer', false]]);
  assert.strictEqual(view.secondsRow.hidden, true);
});

test('a change on the seconds field saves a number', () => {
  const view = fakeView();
  const saved = installSettings({ enabled: true, backOpensMiniplayer: true });
  popup.arm(view);
  view.secondsField.value = '12';
  view.secondsField.handlers.change();
  assert.deepStrictEqual(saved, [['minimumSeconds', 12]]);
});

// An empty field must not write a broken value.
test('an empty seconds field saves nothing and shows the value again', () => {
  const view = fakeView();
  const saved = installSettings({ enabled: true, backOpensMiniplayer: true, minimumSeconds: 5 });
  popup.arm(view);
  view.secondsField.value = '';
  view.secondsField.handlers.change();
  assert.deepStrictEqual(saved, []);
  assert.strictEqual(view.secondsField.value, '5');
});

test('start reads the settings and renders them', async () => {
  const view = fakeView();
  installSettings({ enabled: false, backOpensMiniplayer: true });
  define('document', {
    getElementById(id) {
      if (id === 'toggle') return view.enabledToggle;
      if (id === 'back-toggle') return view.backToggle;
      if (id === 'back-row') return view.backRow;
      if (id === 'seconds') return view.secondsField;
      if (id === 'seconds-row') return view.secondsRow;
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
