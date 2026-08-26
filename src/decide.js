(function (root) {
  'use strict';

  // YouTube keeps the video alive on these paths, or has no miniplayer.
  function isBlockedPath(path) {
    if (typeof path !== 'string') return true;
    if (path === '/watch') return true;
    return path.indexOf('/shorts/') === 0;
  }

  // Returns true when the extension must open the miniplayer.
  function shouldOpenMiniplayer(state) {
    if (!state) return false;
    if (!state.enabled) return false;
    if (!state.onWatchPage) return false;
    if (!state.hasLink) return false;
    if (!state.plainClick) return false;
    if (!state.sameHost) return false;
    if (isBlockedPath(state.destinationPath)) return false;
    if (state.queueOpen) return false;
    if (state.miniplayerOpen) return false;
    return true;
  }

  // Returns true when the back navigation must open the miniplayer.
  function shouldOpenMiniplayerOnBack(state) {
    if (!state) return false;
    if (!state.enabled) return false;
    if (!state.backEnabled) return false;
    if (!state.videoPlaying) return false;
    if (isBlockedPath(state.destinationPath)) return false;
    if (state.queueOpen) return false;
    if (state.miniplayerOpen) return false;
    return true;
  }

  root.YtAmp = root.YtAmp || {};
  root.YtAmp.shouldOpenMiniplayer = shouldOpenMiniplayer;
  root.YtAmp.shouldOpenMiniplayerOnBack = shouldOpenMiniplayerOnBack;
  root.YtAmp.isBlockedPath = isBlockedPath;
})(typeof globalThis !== 'undefined' ? globalThis : this);
