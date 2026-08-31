(function (root) {
  'use strict';

  // YouTube can change these at any time. Repair them here.
  const SELECTORS = {
    queuePanel: '#playlist.ytd-watch-flexy',
    miniplayer: 'ytd-miniplayer',
    video: 'video',
    searchBox: 'yt-searchbox',
    searchSubmit: '.ytSearchboxComponentActions'
  };

  const KEY_TYPES = ['keydown', 'keypress', 'keyup'];

  // The i key makes YouTube navigate. A key repeat must not press it
  // twice, because a second press stops the video.
  const GUARD_MS = 1500;
  let sentAt = null;

  function isWatchPage() {
    return root.location.pathname === '/watch';
  }

  // A queue or a playlist makes the panel visible.
  function isQueueOpen() {
    const panel = root.document.querySelector(SELECTORS.queuePanel);
    return !!panel && !panel.hasAttribute('hidden');
  }

  // The miniplayer is fixed, so offsetParent is null. Ask where the video is.
  function isMiniplayerOpen() {
    const video = root.document.querySelector(SELECTORS.video);
    if (!video || typeof video.closest !== 'function') return false;
    return !!video.closest(SELECTORS.miniplayer);
  }

  function sentKeyRecently() {
    if (sentAt === null) return false;
    return root.Date.now() - sentAt < GUARD_MS;
  }

  // YouTube opens the miniplayer for the i key.
  function openMiniplayer() {
    sentAt = root.Date.now();
    KEY_TYPES.forEach(function (type) {
      root.document.dispatchEvent(new root.KeyboardEvent(type, {
        key: 'i',
        code: 'KeyI',
        keyCode: 73,
        which: 73,
        bubbles: true,
        cancelable: true,
        composed: true
      }));
    });
  }

  root.YtAmp = root.YtAmp || {};
  root.YtAmp.page = {
    SELECTORS: SELECTORS,
    GUARD_MS: GUARD_MS,
    sentKeyRecently: sentKeyRecently,
    isWatchPage: isWatchPage,
    isQueueOpen: isQueueOpen,
    isMiniplayerOpen: isMiniplayerOpen,
    openMiniplayer: openMiniplayer
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
