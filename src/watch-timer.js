(function (root) {
  'use strict';

  const INTERVAL_MS = 1000;
  const WATCH_PATH = '/watch';
  let currentUrl = null;
  let startedAt = null;

  // The page is one application. A new video only changes the URL.
  function sample() {
    const url = root.location.href;
    if (url === currentUrl) return;
    currentUrl = url;
    startedAt = root.location.pathname === WATCH_PATH ? root.Date.now() : null;
  }

  // Returns the seconds since the current watch page opened.
  function secondsOnWatchPage() {
    sample();
    if (startedAt === null) return 0;
    return (root.Date.now() - startedAt) / 1000;
  }

  function start() {
    sample();
    root.setInterval(sample, INTERVAL_MS);
  }

  root.YtAmp = root.YtAmp || {};
  root.YtAmp.watchTimer = {
    INTERVAL_MS: INTERVAL_MS,
    sample: sample,
    secondsOnWatchPage: secondsOnWatchPage,
    start: start
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
