(function (root) {
  'use strict';

  // The back navigation gives no earlier hook. The player is still alive.
  function isVideoPlaying() {
    const video = root.document.querySelector(root.YtAmp.page.SELECTORS.video);
    return !!video && video.paused === false;
  }

  // The URL already holds the destination when popstate runs.
  function buildState() {
    const page = root.YtAmp.page;
    const settings = root.YtAmp.settings;
    return {
      enabled: settings.isEnabled(),
      backEnabled: settings.isBackEnabled(),
      videoPlaying: isVideoPlaying(),
      destinationPath: root.location.pathname,
      queueOpen: page.isQueueOpen(),
      miniplayerOpen: page.isMiniplayerOpen()
    };
  }

  // This must never throw. A failure must never block the navigation.
  function handlePopState() {
    try {
      if (root.YtAmp.shouldOpenMiniplayerOnBack(buildState())) {
        root.YtAmp.page.openMiniplayer();
      }
    } catch (error) {
      // The user's navigation is more important than this extension.
    }
  }

  // Arm the listener after the settings load. An off toggle must stay off.
  function start() {
    root.YtAmp.settings.watch();
    root.YtAmp.settings.load().then(function () {
      root.addEventListener('popstate', handlePopState, true);
    });
  }

  root.YtAmp = root.YtAmp || {};
  root.YtAmp.back = {
    isVideoPlaying: isVideoPlaying,
    buildState: buildState,
    handlePopState: handlePopState,
    start: start
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
