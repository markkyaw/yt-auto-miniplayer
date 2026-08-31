'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { fakeElement, installPage } = require('../support/helpers.js');

require('../src/decide.js');
require('../src/navigate.js');
const nav = globalThis.YtAmp.navigate;

const VIDEO = 'video';

// Installs a stub page and stub settings. Returns the open counter.
function installModules(options) {
  const opts = options || {};
  const opened = { count: 0, watched: 0 };
  globalThis.YtAmp.page = {
    SELECTORS: { video: VIDEO },
    isQueueOpen() { return opts.queueOpen === true; },
    isMiniplayerOpen() { return opts.miniplayerOpen === true; },
    sentKeyRecently() { return opts.sentKeyRecently === true; },
    openMiniplayer() { opened.count += 1; }
  };
  globalThis.YtAmp.settings = {
    isEnabled() { return opts.enabled !== false; },
    isBackEnabled() { return opts.backEnabled !== false; },
    getMinimumSeconds() {
      return opts.minimumSeconds === undefined ? 5 : opts.minimumSeconds;
    },
    load() { return Promise.resolve({}); },
    watch() { opened.watched += 1; }
  };
  globalThis.YtAmp.watchTimer = {
    secondsOnWatchPage() {
      return opts.secondsOnPage === undefined ? 6 : opts.secondsOnPage;
    }
  };
  return opened;
}

// Installs a page that holds a playing video, on a channel page.
function installBackPage(options) {
  const opts = options || {};
  return installPage({
    pathname: opts.pathname === undefined ? '/@somechannel' : opts.pathname,
    navigation: opts.navigation,
    entryIndex: opts.entryIndex,
    bySelector: opts.video === null ? {} : {
      [VIDEO]: fakeElement({ tagName: 'VIDEO', paused: !!opts.paused })
    }
  });
}

// Builds a fake navigate event. The default is a back traversal.
function navigateEvent(options) {
  const opts = options || {};
  return {
    navigationType: opts.navigationType || 'traverse',
    destination: {
      url: opts.url || 'https://www.youtube.com/@somechannel',
      index: opts.index === undefined ? 4 : opts.index
    }
  };
}

test('isVideoPlaying is true when a video runs', () => {
  installBackPage({});
  installModules({});
  assert.strictEqual(nav.isVideoPlaying(), true);
});

test('isVideoPlaying is false when no video exists', () => {
  installBackPage({ video: null });
  installModules({});
  assert.strictEqual(nav.isVideoPlaying(), false);
});

test('isVideoPlaying is false when the video is paused', () => {
  installBackPage({ paused: true });
  installModules({});
  assert.strictEqual(nav.isVideoPlaying(), false);
});

test('handlePopState opens the miniplayer when every rule passes', () => {
  installBackPage({});
  const opened = installModules({});
  nav.handlePopState();
  assert.strictEqual(opened.count, 1);
});

test('handlePopState stays silent when the back toggle is off', () => {
  installBackPage({});
  const opened = installModules({ backEnabled: false });
  nav.handlePopState();
  assert.strictEqual(opened.count, 0);
});

test('handlePopState stays silent when the main toggle is off', () => {
  installBackPage({});
  const opened = installModules({ enabled: false });
  nav.handlePopState();
  assert.strictEqual(opened.count, 0);
});

// A second i key expands the miniplayer and stops the video.
test('handlePopState stays silent when the miniplayer is open', () => {
  installBackPage({});
  const opened = installModules({ miniplayerOpen: true });
  nav.handlePopState();
  assert.strictEqual(opened.count, 0);
});

test('handlePopState stays silent when a queue is open', () => {
  installBackPage({});
  const opened = installModules({ queueOpen: true });
  nav.handlePopState();
  assert.strictEqual(opened.count, 0);
});

test('handlePopState stays silent when the back press lands on a watch page', () => {
  installBackPage({ pathname: '/watch' });
  const opened = installModules({});
  nav.handlePopState();
  assert.strictEqual(opened.count, 0);
});

test('handlePopState stays silent when the video is paused', () => {
  installBackPage({ paused: true });
  const opened = installModules({});
  nav.handlePopState();
  assert.strictEqual(opened.count, 0);
});

test('handlePopState never throws', () => {
  installBackPage({});
  installModules({});
  globalThis.YtAmp.page.isQueueOpen = function () {
    throw new Error('YouTube changed the DOM');
  };
  assert.doesNotThrow(() => nav.handlePopState());
});

test('start arms the popstate listener only after the settings load', async () => {
  const dom = installBackPage({ navigation: false });
  installModules({});
  let finishLoad;
  globalThis.YtAmp.settings.load = function () {
    return new Promise(function (resolve) { finishLoad = resolve; });
  };
  nav.start();
  assert.strictEqual(dom.windowListeners.length, 0);
  finishLoad({});
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.strictEqual(dom.windowListeners.length, 1);
  assert.strictEqual(dom.windowListeners[0].type, 'popstate');
  assert.strictEqual(dom.windowListeners[0].capture, true);
});

// nav.js must not depend on content.js for a current cache.
test('start watches the settings itself', () => {
  installBackPage({});
  const opened = installModules({});
  nav.start();
  assert.strictEqual(opened.watched, 1);
});

test('isBackTraversal is true for a step back in the history', () => {
  installBackPage({ pathname: '/watch', entryIndex: 5 });
  assert.strictEqual(nav.isBackTraversal(navigateEvent({ index: 4 })), true);
});

test('isBackTraversal is false for a step forward', () => {
  installBackPage({ pathname: '/watch', entryIndex: 5 });
  assert.strictEqual(nav.isBackTraversal(navigateEvent({ index: 6 })), false);
});

// The i key makes its own push navigation. It must not press i again.
test('isBackTraversal is false for a push navigation', () => {
  installBackPage({ pathname: '/watch', entryIndex: 5 });
  assert.strictEqual(
    nav.isBackTraversal(navigateEvent({ navigationType: 'push' })), false);
});

test('handleNavigate opens the miniplayer on a back traversal', () => {
  installBackPage({ pathname: '/watch' });
  const opened = installModules({});
  nav.handleNavigate(navigateEvent({}));
  assert.strictEqual(opened.count, 1);
});

test('handleNavigate stays silent away from a watch page', () => {
  installBackPage({ pathname: '/@somechannel' });
  const opened = installModules({});
  nav.handleNavigate(navigateEvent({}));
  assert.strictEqual(opened.count, 0);
});

// location still holds the watch page, so the rule needs the event.
test('handleNavigate reads the destination from the event', () => {
  installBackPage({ pathname: '/watch' });
  const opened = installModules({});
  nav.handleNavigate(navigateEvent({ url: 'https://www.youtube.com/watch?v=abc' }));
  assert.strictEqual(opened.count, 0);
});

test('handleNavigate stays silent for a Short', () => {
  installBackPage({ pathname: '/watch' });
  const opened = installModules({});
  nav.handleNavigate(navigateEvent({ url: 'https://www.youtube.com/shorts/abc' }));
  assert.strictEqual(opened.count, 0);
});

test('handleNavigate never throws', () => {
  installBackPage({ pathname: '/watch' });
  installModules({});
  globalThis.YtAmp.page.isQueueOpen = function () {
    throw new Error('YouTube changed the DOM');
  };
  assert.doesNotThrow(() => nav.handleNavigate(navigateEvent({})));
});

// The navigate event runs before YouTube stops the player. popstate does not.
test('start uses the navigation API when the browser has it', async () => {
  const dom = installBackPage({ pathname: '/watch' });
  installModules({});
  nav.start();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.strictEqual(dom.navigationListeners.length, 1);
  assert.strictEqual(dom.navigationListeners[0].type, 'navigate');
  assert.strictEqual(dom.windowListeners.length, 0);
});

test('start falls back to popstate without the navigation API', async () => {
  const dom = installBackPage({ pathname: '/watch', navigation: false });
  installModules({});
  nav.start();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.strictEqual(dom.windowListeners.length, 1);
  assert.strictEqual(dom.windowListeners[0].type, 'popstate');
});

test('handleNavigate stays silent when the visit was too short', () => {
  installBackPage({ pathname: '/watch' });
  const opened = installModules({ secondsOnPage: 3 });
  nav.handleNavigate(navigateEvent({}));
  assert.strictEqual(opened.count, 0);
});

test('handleNavigate obeys a minimum the user changed', () => {
  installBackPage({ pathname: '/watch' });
  const opened = installModules({ secondsOnPage: 20, minimumSeconds: 30 });
  nav.handleNavigate(navigateEvent({}));
  assert.strictEqual(opened.count, 0);
});

// A search is a push navigation. It carries no link, so the click
// handler never sees it.
test('handleNavigate opens the miniplayer for a search', () => {
  installBackPage({ pathname: '/watch' });
  const opened = installModules({});
  nav.handleNavigate(navigateEvent({
    navigationType: 'push',
    url: 'https://www.youtube.com/results?search_query=cats',
    index: -1
  }));
  assert.strictEqual(opened.count, 1);
});

test('handleNavigate opens the miniplayer for a replace navigation', () => {
  installBackPage({ pathname: '/watch' });
  const opened = installModules({});
  nav.handleNavigate(navigateEvent({
    navigationType: 'replace',
    url: 'https://www.youtube.com/feed/subscriptions',
    index: -1
  }));
  assert.strictEqual(opened.count, 1);
});

// The i key makes its own push navigation. One press is enough.
test('handleNavigate stays silent right after the extension acted', () => {
  installBackPage({ pathname: '/watch' });
  const opened = installModules({ sentKeyRecently: true });
  nav.handleNavigate(navigateEvent({
    navigationType: 'push',
    url: 'https://www.youtube.com/results?search_query=cats',
    index: -1
  }));
  assert.strictEqual(opened.count, 0);
});

test('handleNavigate stays silent for a push to another host', () => {
  installBackPage({ pathname: '/watch' });
  const opened = installModules({});
  nav.handleNavigate(navigateEvent({
    navigationType: 'push',
    url: 'https://example.com/results',
    index: -1
  }));
  assert.strictEqual(opened.count, 0);
});

test('handleNavigate stays silent for a push to another watch page', () => {
  installBackPage({ pathname: '/watch' });
  const opened = installModules({});
  nav.handleNavigate(navigateEvent({
    navigationType: 'push',
    url: 'https://www.youtube.com/watch?v=abc',
    index: -1
  }));
  assert.strictEqual(opened.count, 0);
});

test('handleNavigate stays silent for a reload', () => {
  installBackPage({ pathname: '/watch' });
  const opened = installModules({});
  nav.handleNavigate(navigateEvent({
    navigationType: 'reload',
    url: 'https://www.youtube.com/watch?v=abc',
    index: -1
  }));
  assert.strictEqual(opened.count, 0);
});

// The seconds rule holds for the back button only.
test('a search opens the miniplayer after a short visit', () => {
  installBackPage({ pathname: '/watch' });
  const opened = installModules({ secondsOnPage: 1 });
  nav.handleNavigate(navigateEvent({
    navigationType: 'push',
    url: 'https://www.youtube.com/results?search_query=cats',
    index: -1
  }));
  assert.strictEqual(opened.count, 1);
});
