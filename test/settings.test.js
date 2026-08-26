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
        addListener(listener) { listeners.push(listener); }
      }
    }
  });
  define('chrome', undefined);
  return { store: store, listeners: listeners };
}

test('load uses true when the store is empty', async () => {
  installStorage({});
  assert.strictEqual(await settings.load(), true);
  assert.strictEqual(settings.isEnabled(), true);
});

test('load reads a stored false', async () => {
  installStorage({ enabled: false });
  assert.strictEqual(await settings.load(), false);
  assert.strictEqual(settings.isEnabled(), false);
});

test('load uses true when the storage call fails', async () => {
  installStorage({ enabled: false }, true);
  assert.strictEqual(await settings.load(), true);
});

test('save writes the value and caches it', async () => {
  const fake = installStorage({});
  await settings.save(false);
  assert.strictEqual(fake.store.enabled, false);
  assert.strictEqual(settings.isEnabled(), false);
});

test('watch applies a change at once', async () => {
  const fake = installStorage({});
  await settings.load();
  settings.watch();
  assert.strictEqual(fake.listeners.length, 1);
  fake.listeners[0]({ enabled: { newValue: false } }, 'local');
  assert.strictEqual(settings.isEnabled(), false);
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
});
