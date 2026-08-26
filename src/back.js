(function (root) {
  'use strict';

  const WATCH_PATH = '/watch';

  // The back navigation gives no earlier hook. The player is still alive.
  function isVideoPlaying() {
    const video = root.document.querySelector(root.YtAmp.page.SELECTORS.video);
    return !!video && video.paused === false;
  }

  // A step back in the history. The i key makes a push, so it fails here.
  function isBackTraversal(event) {
    if (!event || event.navigationType !== 'traverse') return false;
    if (!event.destination) return false;
    const entry = root.navigation && root.navigation.currentEntry;
    if (!entry) return false;
    return event.destination.index < entry.index;
  }

  // location still holds the watch page, so the event carries the path.
  function destinationPath(event) {
    try {
      return new root.URL(event.destination.url).pathname;
    } catch (error) {
      return null;
    }
  }

  function buildState(path) {
    const page = root.YtAmp.page;
    const settings = root.YtAmp.settings;
    return {
      enabled: settings.isEnabled(),
      backEnabled: settings.isBackEnabled(),
      videoPlaying: isVideoPlaying(),
      destinationPath: path,
      queueOpen: page.isQueueOpen(),
      miniplayerOpen: page.isMiniplayerOpen()
    };
  }

  function open(path) {
    if (root.YtAmp.shouldOpenMiniplayerOnBack(buildState(path))) {
      root.YtAmp.page.openMiniplayer();
    }
  }

  // This must never throw. A failure must never block the navigation.
  function handleNavigate(event) {
    try {
      if (!isBackTraversal(event)) return;
      if (root.location.pathname !== WATCH_PATH) return;
      open(destinationPath(event));
    } catch (error) {
      // The user's navigation is more important than this extension.
    }
  }

  // The fallback. popstate runs after location moves.
  function handlePopState() {
    try {
      open(root.location.pathname);
    } catch (error) {
      // The user's navigation is more important than this extension.
    }
  }

  // Arm the listener after the settings load. An off toggle must stay off.
  function start() {
    root.YtAmp.settings.watch();
    root.YtAmp.settings.load().then(function () {
      // Chrome stops the player inside its own popstate handler. The
      // navigate event runs before that, while the video still plays.
      if (root.navigation) {
        root.navigation.addEventListener('navigate', handleNavigate);
        return;
      }
      root.addEventListener('popstate', handlePopState, true);
    });
  }

  root.YtAmp = root.YtAmp || {};
  root.YtAmp.back = {
    isVideoPlaying: isVideoPlaying,
    isBackTraversal: isBackTraversal,
    destinationPath: destinationPath,
    buildState: buildState,
    handleNavigate: handleNavigate,
    handlePopState: handlePopState,
    start: start
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
