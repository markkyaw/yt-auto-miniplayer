(function (root) {
  'use strict';

  // YouTube can change these at any time. Repair them here.
  const SELECTORS = {
    queuePanel: '#playlist.ytd-watch-flexy',
    miniplayer: 'ytd-miniplayer',
    video: 'video'
  };

  const KEY_TYPES = ['keydown', 'keypress', 'keyup'];

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

  // YouTube opens the miniplayer for the i key.
  function openMiniplayer() {
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
    isWatchPage: isWatchPage,
    isQueueOpen: isQueueOpen,
    isMiniplayerOpen: isMiniplayerOpen,
    openMiniplayer: openMiniplayer
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
