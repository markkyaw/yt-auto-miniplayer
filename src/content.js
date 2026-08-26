(function (root) {
  'use strict';

  // The click can start inside a shadow root. Read the composed path.
  function findLink(event) {
    if (typeof event.composedPath !== 'function') return null;
    const path = event.composedPath();
    for (let index = 0; index < path.length; index += 1) {
      const node = path[index];
      if (!node || node.tagName !== 'A') continue;
      if (node.getAttribute && node.getAttribute('href')) return node;
    }
    return null;
  }

  // A modifier click or a middle click opens a new tab.
  function isPlainClick(event, link) {
    if (!link) return false;
    if (event.button !== 0) return false;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return false;
    return link.target !== '_blank';
  }

  function buildState(event) {
    const page = root.YtAmp.page;
    const link = findLink(event);
    const state = {
      enabled: root.YtAmp.settings.isEnabled(),
      onWatchPage: page.isWatchPage(),
      hasLink: !!link,
      plainClick: isPlainClick(event, link),
      sameHost: false,
      destinationPath: '',
      queueOpen: page.isQueueOpen(),
      miniplayerOpen: page.isMiniplayerOpen()
    };
    if (!link) return state;
    let url;
    try {
      url = new URL(link.href, root.location.href);
    } catch (error) {
      return state;
    }
    state.sameHost = url.host === root.location.host;
    state.destinationPath = url.pathname;
    return state;
  }

  // This must never throw. A failure must never block the click.
  function handleClick(event) {
    try {
      if (root.YtAmp.shouldOpenMiniplayer(buildState(event))) {
        root.YtAmp.page.openMiniplayer();
      }
    } catch (error) {
      // The user's click is more important than this extension.
    }
  }

  // Arm the listener after the settings load. An off toggle must stay off.
  function start() {
    root.YtAmp.settings.watch();
    root.YtAmp.settings.load().then(function () {
      root.document.addEventListener('click', handleClick, true);
    });
  }

  root.YtAmp = root.YtAmp || {};
  root.YtAmp.content = {
    findLink: findLink,
    isPlainClick: isPlainClick,
    buildState: buildState,
    handleClick: handleClick,
    start: start
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
