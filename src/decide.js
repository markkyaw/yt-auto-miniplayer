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

  // A short visit is a glance. The video is not worth a miniplayer.
  function isLongEnough(seconds, minimum) {
    if (typeof seconds !== 'number') return false;
    if (typeof minimum !== 'number') return false;
    return seconds > minimum;
  }

  // Returns true when the back navigation must open the miniplayer.
  function shouldOpenMiniplayerOnBack(state) {
    if (!state) return false;
    if (!state.enabled) return false;
    if (!state.backEnabled) return false;
    if (!state.videoPlaying) return false;
    if (!isLongEnough(state.secondsOnPage, state.minimumSeconds)) return false;
    if (isBlockedPath(state.destinationPath)) return false;
    if (state.queueOpen) return false;
    if (state.miniplayerOpen) return false;
    return true;
  }

  // Returns true when a search must open the miniplayer. A search
  // leaves the watch page, and its destination is never a watch page.
  function shouldOpenMiniplayerOnSearch(state) {
    if (!state) return false;
    if (!state.enabled) return false;
    if (!state.onWatchPage) return false;
    if (state.queueOpen) return false;
    if (state.miniplayerOpen) return false;
    if (state.recentlyActed) return false;
    return true;
  }

  root.YtAmp = root.YtAmp || {};
  root.YtAmp.shouldOpenMiniplayer = shouldOpenMiniplayer;
  root.YtAmp.shouldOpenMiniplayerOnBack = shouldOpenMiniplayerOnBack;
  root.YtAmp.shouldOpenMiniplayerOnSearch = shouldOpenMiniplayerOnSearch;
  root.YtAmp.isBlockedPath = isBlockedPath;
  root.YtAmp.isLongEnough = isLongEnough;
})(typeof globalThis !== 'undefined' ? globalThis : this);
