'use strict';

const test = require('node:test');
const assert = require('node:assert');

require('../src/decide.js');
const shouldOpenMiniplayer = globalThis.YtAmp.shouldOpenMiniplayer;

// Builds a state that passes every rule.
function state(changes) {
  return Object.assign({
    enabled: true,
    onWatchPage: true,
    hasLink: true,
    plainClick: true,
    sameHost: true,
    destinationPath: '/@somechannel',
    queueOpen: false,
    miniplayerOpen: false
  }, changes);
}

test('all conditions pass', () => {
  assert.strictEqual(shouldOpenMiniplayer(state()), true);
});

test('the toggle is off', () => {
  assert.strictEqual(shouldOpenMiniplayer(state({ enabled: false })), false);
});

test('the page is not a watch page', () => {
  assert.strictEqual(shouldOpenMiniplayer(state({ onWatchPage: false })), false);
});

test('the click hit no link', () => {
  assert.strictEqual(shouldOpenMiniplayer(state({ hasLink: false })), false);
});

test('the click is not a plain left click', () => {
  assert.strictEqual(shouldOpenMiniplayer(state({ plainClick: false })), false);
});

test('the link points to another host', () => {
  assert.strictEqual(shouldOpenMiniplayer(state({ sameHost: false })), false);
});

test('the destination is another watch page', () => {
  assert.strictEqual(shouldOpenMiniplayer(state({ destinationPath: '/watch' })), false);
});

test('the destination is a Short', () => {
  assert.strictEqual(shouldOpenMiniplayer(state({ destinationPath: '/shorts/abc123' })), false);
});

test('the destination path is missing', () => {
  assert.strictEqual(shouldOpenMiniplayer(state({ destinationPath: undefined })), false);
});

test('a queue or a playlist is active', () => {
  assert.strictEqual(shouldOpenMiniplayer(state({ queueOpen: true })), false);
});

test('the miniplayer is open', () => {
  assert.strictEqual(shouldOpenMiniplayer(state({ miniplayerOpen: true })), false);
});

test('the state is missing', () => {
  assert.strictEqual(shouldOpenMiniplayer(undefined), false);
});

test('the home page is a good destination', () => {
  assert.strictEqual(shouldOpenMiniplayer(state({ destinationPath: '/' })), true);
});
