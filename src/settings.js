(function (root) {
  'use strict';

  const KEY = 'enabled';
  const DEFAULT = true;
  let cached = DEFAULT;

  // Firefox and Chrome both answer with promises in Manifest version 3.
  function api() {
    return root.browser || root.chrome;
  }

  // Only an explicit false turns the extension off.
  function cache(value) {
    cached = value !== false;
    return cached;
  }

  function isEnabled() {
    return cached;
  }

  async function load() {
    try {
      const result = await api().storage.local.get(KEY);
      return cache(result ? result[KEY] : DEFAULT);
    } catch (error) {
      return cache(DEFAULT);
    }
  }

  async function save(value) {
    cache(value);
    const values = {};
    values[KEY] = cached;
    await api().storage.local.set(values);
  }

  function watch() {
    api().storage.onChanged.addListener(function (changes, area) {
      if (area !== 'local') return;
      if (!changes || !changes[KEY]) return;
      cache(changes[KEY].newValue);
    });
  }

  root.YtAmp = root.YtAmp || {};
  root.YtAmp.settings = {
    KEY: KEY,
    DEFAULT: DEFAULT,
    isEnabled: isEnabled,
    load: load,
    save: save,
    watch: watch
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
