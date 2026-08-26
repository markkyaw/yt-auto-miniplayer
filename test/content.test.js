'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { fakeElement, installPage } = require('../support/helpers.js');

require('../src/decide.js');
require('../src/content.js');
const content = globalThis.YtAmp.content;

// Replaces the page and settings modules with stubs.
function installModules(options) {
  const opts = options || {};
  const opened = { count: 0 };
  globalThis.YtAmp.page = {
    isWatchPage() { return opts.onWatchPage !== false; },
    isQueueOpen() { return opts.queueOpen === true; },
    isMiniplayerOpen() { return opts.miniplayerOpen === true; },
    openMiniplayer() { opened.count += 1; }
  };
  globalThis.YtAmp.settings = {
    isEnabled() { return opts.enabled !== false; },
    load() { return Promise.resolve(true); },
    watch() {}
  };
  return opened;
}

// Builds a fake click event with a link in the composed path.
function clickEvent(options) {
  const opts = options || {};
  const link = opts.link === null ? null : fakeElement(Object.assign({
    tagName: 'A',
    href: 'https://www.youtube.com/@somechannel',
    attributes: { href: '/@somechannel' }
  }, opts.link));
  return {
    button: opts.button === undefined ? 0 : opts.button,
    ctrlKey: !!opts.ctrlKey,
    metaKey: !!opts.metaKey,
    shiftKey: !!opts.shiftKey,
    altKey: !!opts.altKey,
    composedPath() { return link ? [fakeElement({}), link] : [fakeElement({})]; }
  };
}

test('findLink returns the first anchor with an href', () => {
  installPage({});
  const event = clickEvent({});
  assert.strictEqual(content.findLink(event).tagName, 'A');
});

test('findLink returns null without an anchor', () => {
  installPage({});
  assert.strictEqual(content.findLink(clickEvent({ link: null })), null);
});

test('isPlainClick is true for a left click without a modifier', () => {
  const event = clickEvent({});
  assert.strictEqual(content.isPlainClick(event, content.findLink(event)), true);
});

test('isPlainClick is false for a middle click', () => {
  const event = clickEvent({ button: 1 });
  assert.strictEqual(content.isPlainClick(event, content.findLink(event)), false);
});

['ctrlKey', 'metaKey', 'shiftKey', 'altKey'].forEach((name) => {
  test('isPlainClick is false for ' + name, () => {
    const options = {};
    options[name] = true;
    const event = clickEvent(options);
    assert.strictEqual(content.isPlainClick(event, content.findLink(event)), false);
  });
});

test('isPlainClick is false for a link that opens a new tab', () => {
  const event = clickEvent({ link: { target: '_blank' } });
  assert.strictEqual(content.isPlainClick(event, content.findLink(event)), false);
});

test('buildState reads the destination path', () => {
  installPage({});
  installModules({});
  const state = content.buildState(clickEvent({}));
  assert.strictEqual(state.destinationPath, '/@somechannel');
  assert.strictEqual(state.sameHost, true);
  assert.strictEqual(state.hasLink, true);
  assert.strictEqual(state.plainClick, true);
});

test('buildState marks another host', () => {
  installPage({});
  installModules({});
  const event = clickEvent({ link: { href: 'https://example.com/page' } });
  assert.strictEqual(content.buildState(event).sameHost, false);
});

test('handleClick opens the miniplayer when every rule passes', () => {
  installPage({});
  const opened = installModules({});
  content.handleClick(clickEvent({}));
  assert.strictEqual(opened.count, 1);
});

test('handleClick stays silent when a queue is open', () => {
  installPage({});
  const opened = installModules({ queueOpen: true });
  content.handleClick(clickEvent({}));
  assert.strictEqual(opened.count, 0);
});

test('handleClick stays silent for a Cmd click', () => {
  installPage({});
  const opened = installModules({});
  content.handleClick(clickEvent({ metaKey: true }));
  assert.strictEqual(opened.count, 0);
});

test('handleClick stays silent for another watch page', () => {
  installPage({});
  const opened = installModules({});
  const event = clickEvent({ link: { href: 'https://www.youtube.com/watch?v=abc' } });
  content.handleClick(event);
  assert.strictEqual(opened.count, 0);
});

test('start arms the click listener only after the settings load', async () => {
  const dom = installPage({});
  installModules({});
  let finishLoad;
  globalThis.YtAmp.settings.load = function () {
    return new Promise(function (resolve) { finishLoad = resolve; });
  };
  content.start();
  assert.strictEqual(dom.listeners.length, 0);
  finishLoad(true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.strictEqual(dom.listeners.length, 1);
  assert.strictEqual(dom.listeners[0].type, 'click');
  assert.strictEqual(dom.listeners[0].capture, true);
});

test('handleClick never throws', () => {
  installPage({});
  installModules({});
  globalThis.YtAmp.page.isQueueOpen = function () {
    throw new Error('YouTube changed the DOM');
  };
  assert.doesNotThrow(() => content.handleClick(clickEvent({})));
});
