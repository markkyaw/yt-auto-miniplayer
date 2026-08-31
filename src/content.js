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

  // The search box holds a form that YouTube handles in JavaScript. It
  // fires no submit event, so the Enter key is the earliest signal.
  function isInSearchBox(event) {
    if (typeof event.composedPath !== 'function') return false;
    const selector = root.YtAmp.page.SELECTORS.searchBox;
    return event.composedPath().some(function (node) {
      return !!node && typeof node.matches === 'function' && node.matches(selector);
    });
  }

  // Only the magnifier starts a search. A click on the text field
  // moves the cursor, and it must change nothing.
  function isSearchButton(event) {
    if (typeof event.composedPath !== 'function') return false;
    if (!isInSearchBox(event)) return false;
    return event.composedPath().some(function (node) {
      return !!node && node.tagName === 'BUTTON';
    });
  }

  function isSearchTrigger(event) {
    if (event.key !== 'Enter') return false;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return false;
    return isInSearchBox(event);
  }

  function buildSearchState() {
    const page = root.YtAmp.page;
    return {
      enabled: root.YtAmp.settings.isEnabled(),
      onWatchPage: page.isWatchPage(),
      queueOpen: page.isQueueOpen(),
      miniplayerOpen: page.isMiniplayerOpen(),
      recentlyActed: page.sentKeyRecently()
    };
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
      // The magnifier is a button in the search box, not a link.
      if (isSearchButton(event)) {
        if (root.YtAmp.shouldOpenMiniplayerOnSearch(buildSearchState())) {
          root.YtAmp.page.openMiniplayer();
        }
        return;
      }
      if (root.YtAmp.shouldOpenMiniplayer(buildState(event))) {
        root.YtAmp.page.openMiniplayer();
      }
    } catch (error) {
      // The user's click is more important than this extension.
    }
  }

  // This must never throw. A failure must never block the key press.
  function handleKeyDown(event) {
    try {
      if (!isSearchTrigger(event)) return;
      if (root.YtAmp.shouldOpenMiniplayerOnSearch(buildSearchState())) {
        root.YtAmp.page.openMiniplayer();
      }
    } catch (error) {
      // The user's key press is more important than this extension.
    }
  }

  // Arm the listener after the settings load. An off toggle must stay off.
  function start() {
    root.YtAmp.settings.watch();
    root.YtAmp.settings.load().then(function () {
      root.document.addEventListener('click', handleClick, true);
      root.document.addEventListener('keydown', handleKeyDown, true);
    });
  }

  root.YtAmp = root.YtAmp || {};
  root.YtAmp.content = {
    findLink: findLink,
    isInSearchBox: isInSearchBox,
    isSearchButton: isSearchButton,
    isSearchTrigger: isSearchTrigger,
    buildSearchState: buildSearchState,
    handleKeyDown: handleKeyDown,
    isPlainClick: isPlainClick,
    buildState: buildState,
    handleClick: handleClick,
    start: start
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
