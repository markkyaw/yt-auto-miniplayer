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

const shouldOpenMiniplayerOnBack = globalThis.YtAmp.shouldOpenMiniplayerOnBack;

// Builds a back state that passes every rule.
function backState(changes) {
  return Object.assign({
    enabled: true,
    backEnabled: true,
    videoPlaying: true,
    destinationPath: '/feed/subscriptions',
    queueOpen: false,
    miniplayerOpen: false,
    secondsOnPage: 6,
    minimumSeconds: 5
  }, changes);
}

test('back: all conditions pass', () => {
  assert.strictEqual(shouldOpenMiniplayerOnBack(backState()), true);
});

test('back: the main toggle is off', () => {
  assert.strictEqual(shouldOpenMiniplayerOnBack(backState({ enabled: false })), false);
});

test('back: the back toggle is off', () => {
  assert.strictEqual(shouldOpenMiniplayerOnBack(backState({ backEnabled: false })), false);
});

test('back: no video plays', () => {
  assert.strictEqual(shouldOpenMiniplayerOnBack(backState({ videoPlaying: false })), false);
});

test('back: the destination is another watch page', () => {
  assert.strictEqual(shouldOpenMiniplayerOnBack(backState({ destinationPath: '/watch' })), false);
});

test('back: the destination is a Short', () => {
  assert.strictEqual(shouldOpenMiniplayerOnBack(backState({ destinationPath: '/shorts/abc123' })), false);
});

// A second i key expands the miniplayer and stops the video.
test('back: the miniplayer is open already', () => {
  assert.strictEqual(shouldOpenMiniplayerOnBack(backState({ miniplayerOpen: true })), false);
});

test('back: a queue or a playlist is active', () => {
  assert.strictEqual(shouldOpenMiniplayerOnBack(backState({ queueOpen: true })), false);
});

test('back: the state is missing', () => {
  assert.strictEqual(shouldOpenMiniplayerOnBack(undefined), false);
});

test('back: the home page is a good destination', () => {
  assert.strictEqual(shouldOpenMiniplayerOnBack(backState({ destinationPath: '/' })), true);
});

// A short visit is a glance. The video is not worth a miniplayer.
test('back: the visit is shorter than the minimum', () => {
  assert.strictEqual(
    shouldOpenMiniplayerOnBack(backState({ secondsOnPage: 4.9 })), false);
});

test('back: the visit is exactly the minimum', () => {
  assert.strictEqual(
    shouldOpenMiniplayerOnBack(backState({ secondsOnPage: 5 })), false);
});

test('back: a longer minimum blocks a visit that passed the default', () => {
  assert.strictEqual(
    shouldOpenMiniplayerOnBack(backState({ minimumSeconds: 30 })), false);
});

test('back: a minimum of zero lets every visit pass', () => {
  assert.strictEqual(shouldOpenMiniplayerOnBack(
    backState({ minimumSeconds: 0, secondsOnPage: 0.2 })), true);
});

test('back: the seconds are missing', () => {
  assert.strictEqual(
    shouldOpenMiniplayerOnBack(backState({ secondsOnPage: undefined })), false);
});
