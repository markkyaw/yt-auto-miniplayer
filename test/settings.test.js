'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { define } = require('../support/helpers.js');

require('../src/settings.js');
const settings = globalThis.YtAmp.settings;

// Installs a stub storage API. Returns the store and the listeners.
function installStorage(initial, failing) {
  const store = Object.assign({}, initial);
  const listeners = [];
  define('browser', {
    storage: {
      local: {
        async get() {
          if (failing) throw new Error('storage is not available');
          return Object.assign({}, store);
        },
        async set(values) {
          Object.assign(store, values);
        }
      },
      onChanged: {
        addListener(listener) { listeners.push(listener); },
        removeListener(listener) {
          const at = listeners.indexOf(listener);
          if (at !== -1) listeners.splice(at, 1);
        }
      }
    }
  });
  define('chrome', undefined);
  return { store: store, listeners: listeners };
}

test('load uses true for both keys when the store is empty', async () => {
  installStorage({});
  assert.deepStrictEqual(await settings.load(),
    { enabled: true, backOpensMiniplayer: true });
  assert.strictEqual(settings.isEnabled(), true);
  assert.strictEqual(settings.isBackEnabled(), true);
});

test('load reads a stored false for the main key', async () => {
  installStorage({ enabled: false });
  assert.strictEqual(settings.isEnabled(), true);
  await settings.load();
  assert.strictEqual(settings.isEnabled(), false);
  assert.strictEqual(settings.isBackEnabled(), true);
});

test('load reads a stored false for the back key', async () => {
  installStorage({ backOpensMiniplayer: false });
  await settings.load();
  assert.strictEqual(settings.isEnabled(), true);
  assert.strictEqual(settings.isBackEnabled(), false);
});

test('load uses true when the storage call fails', async () => {
  installStorage({ enabled: false, backOpensMiniplayer: false }, true);
  assert.deepStrictEqual(await settings.load(),
    { enabled: true, backOpensMiniplayer: true });
});

test('save writes the main key and caches it', async () => {
  const fake = installStorage({});
  await settings.save('enabled', false);
  assert.strictEqual(fake.store.enabled, false);
  assert.strictEqual(settings.isEnabled(), false);
});

test('save writes the back key and caches it', async () => {
  const fake = installStorage({});
  await settings.save('backOpensMiniplayer', false);
  assert.strictEqual(fake.store.backOpensMiniplayer, false);
  assert.strictEqual(settings.isBackEnabled(), false);
});

test('save ignores a key the module does not own', async () => {
  const fake = installStorage({});
  await settings.save('theme', 'dark');
  assert.strictEqual('theme' in fake.store, false);
});

test('watch applies a main key change at once', async () => {
  const fake = installStorage({});
  await settings.load();
  settings.watch();
  assert.strictEqual(fake.listeners.length, 1);
  fake.listeners[0]({ enabled: { newValue: false } }, 'local');
  assert.strictEqual(settings.isEnabled(), false);
});

test('watch applies a back key change at once', async () => {
  const fake = installStorage({});
  await settings.load();
  settings.watch();
  fake.listeners[0]({ backOpensMiniplayer: { newValue: false } }, 'local');
  assert.strictEqual(settings.isBackEnabled(), false);
  assert.strictEqual(settings.isEnabled(), true);
});

test('watch ignores another storage area', async () => {
  const fake = installStorage({});
  await settings.load();
  settings.watch();
  fake.listeners[0]({ enabled: { newValue: false } }, 'sync');
  assert.strictEqual(settings.isEnabled(), true);
});

test('watch ignores another key', async () => {
  const fake = installStorage({});
  await settings.load();
  settings.watch();
  fake.listeners[0]({ theme: { newValue: 'dark' } }, 'local');
  assert.strictEqual(settings.isEnabled(), true);
  assert.strictEqual(settings.isBackEnabled(), true);
});

// Both content.js and back.js call watch(). One listener is enough.
test('watch registers one listener even after two calls', async () => {
  const fake = installStorage({});
  await settings.load();
  settings.watch();
  settings.watch();
  assert.strictEqual(fake.listeners.length, 1);
});
