'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { fakeElement, installPage } = require('../support/helpers.js');

require('../src/youtube-page.js');
const page = globalThis.YtAmp.page;

test('isWatchPage is true on a watch page', () => {
  installPage({ pathname: '/watch' });
  assert.strictEqual(page.isWatchPage(), true);
});

test('isWatchPage is false on a channel page', () => {
  installPage({ pathname: '/@somechannel' });
  assert.strictEqual(page.isWatchPage(), false);
});

test('isQueueOpen is false when the panel is missing', () => {
  installPage({});
  assert.strictEqual(page.isQueueOpen(), false);
});

test('isQueueOpen is false when the panel is hidden', () => {
  installPage({
    bySelector: {
      [page.SELECTORS.queuePanel]: fakeElement({ attributes: { hidden: '' } })
    }
  });
  assert.strictEqual(page.isQueueOpen(), false);
});

test('isQueueOpen is true when the panel shows', () => {
  installPage({
    bySelector: { [page.SELECTORS.queuePanel]: fakeElement({}) }
  });
  assert.strictEqual(page.isQueueOpen(), true);
});

test('isMiniplayerOpen is false when the video is missing', () => {
  installPage({});
  assert.strictEqual(page.isMiniplayerOpen(), false);
});

test('isMiniplayerOpen is false when the video sits outside the miniplayer', () => {
  installPage({
    bySelector: {
      [page.SELECTORS.video]: fakeElement({ tagName: 'VIDEO', closest: {} })
    }
  });
  assert.strictEqual(page.isMiniplayerOpen(), false);
});

// The real miniplayer uses position: fixed, so offsetParent is null.
test('isMiniplayerOpen is true when the video sits in a fixed miniplayer', () => {
  const mini = fakeElement({ tagName: 'YTD-MINIPLAYER', offsetParent: null });
  installPage({
    bySelector: {
      [page.SELECTORS.video]: fakeElement({
        tagName: 'VIDEO',
        closest: { [page.SELECTORS.miniplayer]: mini }
      })
    }
  });
  assert.strictEqual(page.isMiniplayerOpen(), true);
});

test('openMiniplayer sends three key events for the i key', () => {
  const dom = installPage({});
  page.openMiniplayer();
  const sent = dom.keyEvents;
  assert.deepStrictEqual(sent.map((event) => event.type),
    ['keydown', 'keypress', 'keyup']);
  sent.forEach((event) => {
    assert.strictEqual(event.key, 'i');
    assert.strictEqual(event.code, 'KeyI');
    assert.strictEqual(event.keyCode, 73);
    assert.strictEqual(event.which, 73);
    assert.strictEqual(event.bubbles, true);
    assert.strictEqual(event.cancelable, true);
    assert.strictEqual(event.composed, true);
  });
});
