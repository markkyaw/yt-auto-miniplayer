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
    SELECTORS: {
      searchBox: 'yt-searchbox',
      searchSubmit: '.ytSearchboxComponentActions',
      searchSuggestion: '.ytSearchboxComponentSuggestionsContainer'
    },
    isWatchPage() { return opts.onWatchPage !== false; },
    isQueueOpen() { return opts.queueOpen === true; },
    isMiniplayerOpen() { return opts.miniplayerOpen === true; },
    sentKeyRecently() { return opts.sentKeyRecently === true; },
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

// The search box is a form that YouTube handles in JavaScript. It
// fires no submit event, so the extension reads the Enter key.
function searchElement() {
  return fakeElement({ tagName: 'YT-SEARCHBOX', matches: ['yt-searchbox'] });
}

function keyEvent(options) {
  const opts = options || {};
  const path = opts.inSearchBox === false
    ? [fakeElement({})] : [fakeElement({}), searchElement()];
  return {
    key: opts.key === undefined ? 'Enter' : opts.key,
    ctrlKey: !!opts.ctrlKey,
    metaKey: !!opts.metaKey,
    shiftKey: !!opts.shiftKey,
    altKey: !!opts.altKey,
    composedPath() { return path; }
  };
}

test('isSearchTrigger is true for Enter inside the search box', () => {
  installPage({});
  installModules({});
  assert.strictEqual(content.isSearchTrigger(keyEvent({})), true);
});

test('isSearchTrigger is false for Enter outside the search box', () => {
  installPage({});
  installModules({});
  assert.strictEqual(
    content.isSearchTrigger(keyEvent({ inSearchBox: false })), false);
});

test('isSearchTrigger is false for another key', () => {
  installPage({});
  installModules({});
  assert.strictEqual(content.isSearchTrigger(keyEvent({ key: 'a' })), false);
});

test('isSearchTrigger is false for Shift and Enter', () => {
  installPage({});
  installModules({});
  assert.strictEqual(
    content.isSearchTrigger(keyEvent({ shiftKey: true })), false);
});

test('handleKeyDown opens the miniplayer for a search', () => {
  installPage({});
  const opened = installModules({});
  content.handleKeyDown(keyEvent({}));
  assert.strictEqual(opened.count, 1);
});

test('handleKeyDown stays silent away from a watch page', () => {
  installPage({});
  const opened = installModules({ onWatchPage: false });
  content.handleKeyDown(keyEvent({}));
  assert.strictEqual(opened.count, 0);
});

test('handleKeyDown stays silent when the toggle is off', () => {
  installPage({});
  const opened = installModules({ enabled: false });
  content.handleKeyDown(keyEvent({}));
  assert.strictEqual(opened.count, 0);
});

test('handleKeyDown stays silent when a queue is open', () => {
  installPage({});
  const opened = installModules({ queueOpen: true });
  content.handleKeyDown(keyEvent({}));
  assert.strictEqual(opened.count, 0);
});

// A held Enter key repeats. One press is enough.
test('handleKeyDown stays silent right after the extension acted', () => {
  installPage({});
  const opened = installModules({ sentKeyRecently: true });
  content.handleKeyDown(keyEvent({}));
  assert.strictEqual(opened.count, 0);
});

test('handleKeyDown never throws', () => {
  installPage({});
  installModules({});
  globalThis.YtAmp.page.isQueueOpen = function () {
    throw new Error('YouTube changed the DOM');
  };
  assert.doesNotThrow(() => content.handleKeyDown(keyEvent({})));
});

// The magnifier is a button inside the same box, not a link.
test('handleClick opens the miniplayer for the magnifier button', () => {
  installPage({});
  const opened = installModules({});
  const event = clickEvent({ link: null });
  event.composedPath = function () {
    return [
      fakeElement({ tagName: 'BUTTON' }),
      fakeElement({ tagName: 'DIV', matches: ['.ytSearchboxComponentActions'] }),
      searchElement()
    ];
  };
  content.handleClick(event);
  assert.strictEqual(opened.count, 1);
});

// The X only clears the query. The user stays on the watch page.
test('handleClick stays silent for the clear button', () => {
  installPage({});
  const opened = installModules({});
  const event = clickEvent({ link: null });
  event.composedPath = function () {
    return [fakeElement({ tagName: 'BUTTON' }), searchElement()];
  };
  content.handleClick(event);
  assert.strictEqual(opened.count, 0);
});

// A click on the text field only puts the cursor in the box.
test('handleClick stays silent for a click on the search field', () => {
  installPage({});
  const opened = installModules({});
  const event = clickEvent({ link: null });
  event.composedPath = function () {
    return [fakeElement({ tagName: 'TEXTAREA' }), searchElement()];
  };
  content.handleClick(event);
  assert.strictEqual(opened.count, 0);
});

test('start arms the key listener as well as the click listener', async () => {
  const dom = installPage({});
  installModules({});
  content.start();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.strictEqual(dom.listeners[1].type, 'keydown');
  assert.strictEqual(dom.listeners[1].capture, true);
});

// The suggestion list closes before the click, so mousedown is the
// only event that still carries the suggestion.
function suggestionEvent(options) {
  const opts = options || {};
  const path = [fakeElement({ tagName: 'SPAN' })];
  if (opts.button === undefined || opts.onSuggestion !== false) {
    if (opts.hasButton) path.push(fakeElement({ tagName: 'BUTTON' }));
    path.push(fakeElement({
      tagName: 'DIV',
      matches: ['.ytSearchboxComponentSuggestionsContainer']
    }));
  }
  return {
    button: opts.button === undefined ? 0 : opts.button,
    composedPath() { return opts.onSuggestion === false ? [fakeElement({})] : path; }
  };
}

test('handleMouseDown opens the miniplayer for a suggestion', () => {
  installPage({});
  const opened = installModules({});
  content.handleMouseDown(suggestionEvent({}));
  assert.strictEqual(opened.count, 1);
});

test('handleMouseDown stays silent outside the suggestion list', () => {
  installPage({});
  const opened = installModules({});
  content.handleMouseDown(suggestionEvent({ onSuggestion: false }));
  assert.strictEqual(opened.count, 0);
});

// A row holds a Remove button. That button starts no search.
test('handleMouseDown stays silent for a button in the list', () => {
  installPage({});
  const opened = installModules({});
  content.handleMouseDown(suggestionEvent({ hasButton: true }));
  assert.strictEqual(opened.count, 0);
});

test('handleMouseDown stays silent for a middle click', () => {
  installPage({});
  const opened = installModules({});
  content.handleMouseDown(suggestionEvent({ button: 1 }));
  assert.strictEqual(opened.count, 0);
});

test('handleMouseDown stays silent away from a watch page', () => {
  installPage({});
  const opened = installModules({ onWatchPage: false });
  content.handleMouseDown(suggestionEvent({}));
  assert.strictEqual(opened.count, 0);
});

test('handleMouseDown never throws', () => {
  installPage({});
  installModules({});
  globalThis.YtAmp.page.isQueueOpen = function () {
    throw new Error('YouTube changed the DOM');
  };
  assert.doesNotThrow(() => content.handleMouseDown(suggestionEvent({})));
});

test('start arms the mousedown listener too', async () => {
  const dom = installPage({});
  installModules({});
  content.start();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepStrictEqual(dom.listeners.map((one) => one.type),
    ['click', 'keydown', 'mousedown']);
  assert.strictEqual(dom.listeners[2].capture, true);
});
