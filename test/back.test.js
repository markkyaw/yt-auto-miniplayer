'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { fakeElement, installPage } = require('../support/helpers.js');

require('../src/decide.js');
require('../src/back.js');
const back = globalThis.YtAmp.back;

const VIDEO = 'video';

// Installs a stub page and stub settings. Returns the open counter.
function installModules(options) {
  const opts = options || {};
  const opened = { count: 0, watched: 0 };
  globalThis.YtAmp.page = {
    SELECTORS: { video: VIDEO },
    isQueueOpen() { return opts.queueOpen === true; },
    isMiniplayerOpen() { return opts.miniplayerOpen === true; },
    openMiniplayer() { opened.count += 1; }
  };
  globalThis.YtAmp.settings = {
    isEnabled() { return opts.enabled !== false; },
    isBackEnabled() { return opts.backEnabled !== false; },
    load() { return Promise.resolve({}); },
    watch() { opened.watched += 1; }
  };
  return opened;
}

// Installs a page that holds a playing video, on a channel page.
function installBackPage(options) {
  const opts = options || {};
  return installPage({
    pathname: opts.pathname === undefined ? '/@somechannel' : opts.pathname,
    bySelector: opts.video === null ? {} : {
      [VIDEO]: fakeElement({ tagName: 'VIDEO', paused: !!opts.paused })
    }
  });
}

test('isVideoPlaying is true when a video runs', () => {
  installBackPage({});
  installModules({});
  assert.strictEqual(back.isVideoPlaying(), true);
});

test('isVideoPlaying is false when no video exists', () => {
  installBackPage({ video: null });
  installModules({});
  assert.strictEqual(back.isVideoPlaying(), false);
});

test('isVideoPlaying is false when the video is paused', () => {
  installBackPage({ paused: true });
  installModules({});
  assert.strictEqual(back.isVideoPlaying(), false);
});

test('handlePopState opens the miniplayer when every rule passes', () => {
  installBackPage({});
  const opened = installModules({});
  back.handlePopState();
  assert.strictEqual(opened.count, 1);
});

test('handlePopState stays silent when the back toggle is off', () => {
  installBackPage({});
  const opened = installModules({ backEnabled: false });
  back.handlePopState();
  assert.strictEqual(opened.count, 0);
});

test('handlePopState stays silent when the main toggle is off', () => {
  installBackPage({});
  const opened = installModules({ enabled: false });
  back.handlePopState();
  assert.strictEqual(opened.count, 0);
});

// A second i key expands the miniplayer and stops the video.
test('handlePopState stays silent when the miniplayer is open', () => {
  installBackPage({});
  const opened = installModules({ miniplayerOpen: true });
  back.handlePopState();
  assert.strictEqual(opened.count, 0);
});

test('handlePopState stays silent when a queue is open', () => {
  installBackPage({});
  const opened = installModules({ queueOpen: true });
  back.handlePopState();
  assert.strictEqual(opened.count, 0);
});

test('handlePopState stays silent when the back press lands on a watch page', () => {
  installBackPage({ pathname: '/watch' });
  const opened = installModules({});
  back.handlePopState();
  assert.strictEqual(opened.count, 0);
});

test('handlePopState stays silent when the video is paused', () => {
  installBackPage({ paused: true });
  const opened = installModules({});
  back.handlePopState();
  assert.strictEqual(opened.count, 0);
});

test('handlePopState never throws', () => {
  installBackPage({});
  installModules({});
  globalThis.YtAmp.page.isQueueOpen = function () {
    throw new Error('YouTube changed the DOM');
  };
  assert.doesNotThrow(() => back.handlePopState());
});

test('start arms the popstate listener only after the settings load', async () => {
  const dom = installBackPage({});
  installModules({});
  let finishLoad;
  globalThis.YtAmp.settings.load = function () {
    return new Promise(function (resolve) { finishLoad = resolve; });
  };
  back.start();
  assert.strictEqual(dom.windowListeners.length, 0);
  finishLoad({});
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.strictEqual(dom.windowListeners.length, 1);
  assert.strictEqual(dom.windowListeners[0].type, 'popstate');
  assert.strictEqual(dom.windowListeners[0].capture, true);
});

// back.js must not depend on content.js for a current cache.
test('start watches the settings itself', () => {
  installBackPage({});
  const opened = installModules({});
  back.start();
  assert.strictEqual(opened.watched, 1);
});
