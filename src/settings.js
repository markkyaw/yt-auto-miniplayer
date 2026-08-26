(function (root) {
  'use strict';

  // Every key the module owns, with its default value.
  const DEFAULTS = {
    enabled: true,
    backOpensMiniplayer: true,
    minimumSeconds: 5
  };
  const NAMES = Object.keys(DEFAULTS);
  const cached = Object.assign({}, DEFAULTS);
  let listener = null;

  // Firefox and Chrome both answer with promises in Manifest version 3.
  function api() {
    return root.browser || root.chrome;
  }

  // Only an explicit false turns a switch off. A broken number
  // falls back to the default, so the rule always has one.
  function coerce(name, value) {
    if (typeof DEFAULTS[name] !== 'number') return value !== false;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return DEFAULTS[name];
    return number;
  }

  function cache(name, value) {
    cached[name] = coerce(name, value);
    return cached[name];
  }

  function owns(name) {
    return Object.prototype.hasOwnProperty.call(DEFAULTS, name);
  }

  function isEnabled() {
    return cached.enabled;
  }

  function isBackEnabled() {
    return cached.backOpensMiniplayer;
  }

  function getMinimumSeconds() {
    return cached.minimumSeconds;
  }

  async function load() {
    let stored = null;
    try {
      stored = await api().storage.local.get(NAMES);
    } catch (error) {
      stored = null;
    }
    NAMES.forEach(function (name) {
      cache(name, stored ? stored[name] : DEFAULTS[name]);
    });
    return Object.assign({}, cached);
  }

  async function save(name, value) {
    if (!owns(name)) return;
    cache(name, value);
    const values = {};
    values[name] = cached[name];
    await api().storage.local.set(values);
  }

  // Two modules call watch(). One listener keeps the cache current.
  function watch() {
    const events = api().storage.onChanged;
    if (listener) events.removeListener(listener);
    listener = function (changes, area) {
      if (area !== 'local') return;
      if (!changes) return;
      NAMES.forEach(function (name) {
        if (changes[name]) cache(name, changes[name].newValue);
      });
    };
    events.addListener(listener);
  }

  root.YtAmp = root.YtAmp || {};
  root.YtAmp.settings = {
    DEFAULTS: DEFAULTS,
    isEnabled: isEnabled,
    isBackEnabled: isBackEnabled,
    getMinimumSeconds: getMinimumSeconds,
    load: load,
    save: save,
    watch: watch
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
