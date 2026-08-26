# YT Auto Miniplayer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Firefox and Chrome extension that opens the YouTube miniplayer when the user leaves a watch page by a link click, and only when no queue is active.

**Architecture:** A content script only. No background script. A capture-phase `click` listener on `document` reads the click, builds a plain state object, and passes it to one pure decision function. If the answer is `true`, the page module sends a synthetic `i` key event to `document`. YouTube opens the miniplayer, and the click then navigates as normal.

**Tech Stack:** Plain JavaScript. Manifest version 3. `node --test` for unit tests. No third-party libraries. No build step.

**Spec:** `docs/superpowers/specs/2026-08-26-yt-auto-miniplayer-design.md`

## Global Constraints

- No third-party dependency. No `npm install`. Node built-in modules only.
- No `package.json`. Node then treats every `.js` file as CommonJS, and `require` works.
- A content script cannot use `import` or `export`. Each source file is an IIFE that adds one property to the global object `YtAmp`.
- The click listener must never call `preventDefault()` and must never throw. The user's click always works.
- Write every comment in fewer than 15 words, in ASD-STE100 Simplified Technical English.
- Manifest version 3. One `manifest.json` serves Firefox and Chrome.
- Permission list: `storage` only.
- Host match: `*://*.youtube.com/*`.
- Run the tests with `node --test`. Node 25 cannot take a directory
  argument, and bare `node --test` runs every file under `test/`.
- The shared stubs live in `support/helpers.js`, not in `test/`. A file
  inside `test/` runs as a test file.

## File Structure

| File | Responsibility |
|---|---|
| `src/decide.js` | The pure rule. State in, boolean out. No DOM. |
| `src/youtube-page.js` | Every YouTube selector. Reads the page state. Sends the key event. |
| `src/settings.js` | Reads and writes the toggle in `storage.local`. Caches the value. |
| `src/content.js` | Reads the click. Builds the state. Joins the other three modules. |
| `src/main.js` | Starts the content script. One line. Keeps `content.js` testable. |
| `popup.html` | The toolbar popup markup. |
| `src/popup.js` | The toolbar toggle behavior. |
| `manifest.json` | The extension manifest. |
| `support/helpers.js` | Stub `document`, `location`, `KeyboardEvent`, and `storage`. |
| `test/*.test.js` | The unit tests. |
| `README.md` | How to load and test the extension. |

---

### Task 1: The repository and the decision rule

**Files:**
- Create: `.gitignore`
- Create: `src/decide.js`
- Test: `test/decide.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `globalThis.YtAmp.shouldOpenMiniplayer(state) -> boolean`.
  `state` is a plain object with these fields: `enabled` (boolean),
  `onWatchPage` (boolean), `hasLink` (boolean), `plainClick` (boolean),
  `sameHost` (boolean), `destinationPath` (string), `queueOpen` (boolean),
  `miniplayerOpen` (boolean).

- [x] **Step 1: Create the ignore file**

```bash
cat > .gitignore <<'EOF'
node_modules/
*.zip
*.xpi
.DS_Store
EOF
```

- [x] **Step 2: Write the failing test**

Create `test/decide.test.js`:

```js
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
```

- [x] **Step 3: Run the test and confirm that it fails**

Run: `node --test`
Expected: FAIL. The message says that `src/decide.js` does not exist.

- [x] **Step 4: Write the code**

Create `src/decide.js`:

```js
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

  root.YtAmp = root.YtAmp || {};
  root.YtAmp.shouldOpenMiniplayer = shouldOpenMiniplayer;
  root.YtAmp.isBlockedPath = isBlockedPath;
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [x] **Step 5: Run the test and confirm that it passes**

Run: `node --test`
Expected: PASS. 13 tests pass.

- [x] **Step 6: Commit**

```bash
git add .gitignore src/decide.js test/decide.test.js
git commit -m "Add the miniplayer decision rule"
```

---

### Task 2: The YouTube page module

**Files:**
- Create: `support/helpers.js`
- Create: `src/youtube-page.js`
- Test: `test/youtube-page.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `globalThis.YtAmp.page`, an object with these members:
  - `SELECTORS` — an object with the keys `queuePanel` and `miniplayer`.
  - `isWatchPage() -> boolean`
  - `isQueueOpen() -> boolean`
  - `isMiniplayerOpen() -> boolean`
  - `openMiniplayer() -> undefined`
- Also produces `support/helpers.js` with `fakeElement(options)`,
  `installPage(options)`, and `define(name, value)`. Later tasks use all
  three. `installPage` returns `{ keyEvents, listeners }`.

- [x] **Step 1: Write the test helpers**

Create `support/helpers.js`:

```js
'use strict';

// Builds a fake element for the stub document.
function fakeElement(options) {
  const opts = options || {};
  return {
    tagName: opts.tagName || 'DIV',
    href: opts.href || '',
    target: opts.target || '',
    offsetParent: opts.offsetParent === undefined ? {} : opts.offsetParent,
    attributes: opts.attributes || {},
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name);
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name)
        ? this.attributes[name] : null;
    },
    getBoundingClientRect() {
      return { width: opts.width === undefined ? 320 : opts.width };
    }
  };
}

// Installs a stub document, location, and KeyboardEvent.
function installPage(options) {
  const opts = options || {};
  const bySelector = opts.bySelector || {};
  const host = opts.host || 'www.youtube.com';
  const pathname = opts.pathname === undefined ? '/watch' : opts.pathname;
  const keyEvents = [];
  const listeners = [];

  define('location', {
    pathname: pathname,
    host: host,
    hostname: host,
    href: 'https://' + host + pathname
  });
  define('document', {
    querySelector(selector) {
      return bySelector[selector] || null;
    },
    dispatchEvent(event) {
      keyEvents.push(event);
      return true;
    },
    addEventListener(type, handler, capture) {
      listeners.push({ type: type, handler: handler, capture: capture });
    }
  });
  define('KeyboardEvent', function (type, init) {
    Object.assign(this, init || {});
    this.type = type;
  });
  return { keyEvents: keyEvents, listeners: listeners };
}

// Replaces a global, even when the runtime defines it already.
function define(name, value) {
  Object.defineProperty(globalThis, name, {
    value: value, writable: true, configurable: true
  });
}

module.exports = { fakeElement, installPage, define };
```

- [x] **Step 2: Write the failing test**

Create `test/youtube-page.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { fakeElement, installPage } = require('../support/helpers.js');

require('../src/youtube-page.js');
const page = globalThis.YtAmp.page;

test('isWatchPage is true on a watch page', () => {
  installPage({ pathname: '/watch' });
  assert.strictEqual(page.isWatchPage(), true);
});

test('isWatchPage is false on a channel page', () => {
  installPage({ pathname: '/@somechannel' });
  assert.strictEqual(page.isWatchPage(), false);
});

test('isQueueOpen is false when the panel is missing', () => {
  installPage({});
  assert.strictEqual(page.isQueueOpen(), false);
});

test('isQueueOpen is false when the panel is hidden', () => {
  installPage({
    bySelector: {
      [page.SELECTORS.queuePanel]: fakeElement({ attributes: { hidden: '' } })
    }
  });
  assert.strictEqual(page.isQueueOpen(), false);
});

test('isQueueOpen is true when the panel shows', () => {
  installPage({
    bySelector: { [page.SELECTORS.queuePanel]: fakeElement({}) }
  });
  assert.strictEqual(page.isQueueOpen(), true);
});

test('isMiniplayerOpen is false when the element is missing', () => {
  installPage({});
  assert.strictEqual(page.isMiniplayerOpen(), false);
});

test('isMiniplayerOpen is false when the element has no offsetParent', () => {
  installPage({
    bySelector: {
      [page.SELECTORS.miniplayer]: fakeElement({ offsetParent: null })
    }
  });
  assert.strictEqual(page.isMiniplayerOpen(), false);
});

test('isMiniplayerOpen is false when the width is zero', () => {
  installPage({
    bySelector: { [page.SELECTORS.miniplayer]: fakeElement({ width: 0 }) }
  });
  assert.strictEqual(page.isMiniplayerOpen(), false);
});

test('isMiniplayerOpen is true when the element shows', () => {
  installPage({
    bySelector: { [page.SELECTORS.miniplayer]: fakeElement({ width: 320 }) }
  });
  assert.strictEqual(page.isMiniplayerOpen(), true);
});

test('openMiniplayer sends three key events for the i key', () => {
  const dom = installPage({});
  page.openMiniplayer();
  const sent = dom.keyEvents;
  assert.deepStrictEqual(sent.map((event) => event.type),
    ['keydown', 'keypress', 'keyup']);
  sent.forEach((event) => {
    assert.strictEqual(event.key, 'i');
    assert.strictEqual(event.code, 'KeyI');
    assert.strictEqual(event.keyCode, 73);
    assert.strictEqual(event.which, 73);
    assert.strictEqual(event.bubbles, true);
    assert.strictEqual(event.cancelable, true);
    assert.strictEqual(event.composed, true);
  });
});
```

- [x] **Step 3: Run the test and confirm that it fails**

Run: `node --test`
Expected: FAIL. The message says that `src/youtube-page.js` does not exist.

- [x] **Step 4: Write the code**

Create `src/youtube-page.js`:

```js
(function (root) {
  'use strict';

  // YouTube can change these at any time. Repair them here.
  const SELECTORS = {
    queuePanel: '#playlist.ytd-watch-flexy',
    miniplayer: 'ytd-miniplayer'
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

  // The element always exists. Visibility is the real signal.
  function isMiniplayerOpen() {
    const mini = root.document.querySelector(SELECTORS.miniplayer);
    if (!mini) return false;
    if (mini.offsetParent === null) return false;
    return mini.getBoundingClientRect().width > 0;
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
```

- [x] **Step 5: Run the test and confirm that it passes**

Run: `node --test`
Expected: PASS. All tests from Task 1 and Task 2 pass.

- [x] **Step 6: Commit**

```bash
git add src/youtube-page.js test/youtube-page.test.js support/helpers.js
git commit -m "Add the YouTube page module and the test helpers"
```

---

### Task 3: The settings module

**Files:**
- Create: `src/settings.js`
- Test: `test/settings.test.js`

**Interfaces:**
- Consumes: `support/helpers.js` `define(name, value)` from Task 2.
- Produces: `globalThis.YtAmp.settings`, an object with these members:
  - `KEY` — the string `'enabled'`.
  - `DEFAULT` — the boolean `true`.
  - `isEnabled() -> boolean` — the cached value. Never a promise.
  - `load() -> Promise<boolean>` — reads `storage.local` and caches.
  - `save(value) -> Promise<undefined>` — writes `storage.local`.
  - `watch() -> undefined` — subscribes to `storage.onChanged`.

- [x] **Step 1: Write the failing test**

Create `test/settings.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { define } = require('../support/helpers.js');

require('../src/settings.js');
const settings = globalThis.YtAmp.settings;

// Installs a stub storage API. Returns the store and the listeners.
function installStorage(initial, failing) {
  const store = Object.assign({}, initial);
  const listeners = [];
  define('browser', {
    storage: {
      local: {
        async get() {
          if (failing) throw new Error('storage is not available');
          return Object.assign({}, store);
        },
        async set(values) {
          Object.assign(store, values);
        }
      },
      onChanged: {
        addListener(listener) { listeners.push(listener); }
      }
    }
  });
  define('chrome', undefined);
  return { store: store, listeners: listeners };
}

test('load uses true when the store is empty', async () => {
  installStorage({});
  assert.strictEqual(await settings.load(), true);
  assert.strictEqual(settings.isEnabled(), true);
});

test('load reads a stored false', async () => {
  installStorage({ enabled: false });
  assert.strictEqual(await settings.load(), false);
  assert.strictEqual(settings.isEnabled(), false);
});

test('load uses true when the storage call fails', async () => {
  installStorage({ enabled: false }, true);
  assert.strictEqual(await settings.load(), true);
});

test('save writes the value and caches it', async () => {
  const fake = installStorage({});
  await settings.save(false);
  assert.strictEqual(fake.store.enabled, false);
  assert.strictEqual(settings.isEnabled(), false);
});

test('watch applies a change at once', async () => {
  const fake = installStorage({});
  await settings.load();
  settings.watch();
  assert.strictEqual(fake.listeners.length, 1);
  fake.listeners[0]({ enabled: { newValue: false } }, 'local');
  assert.strictEqual(settings.isEnabled(), false);
});

test('watch ignores another storage area', async () => {
  const fake = installStorage({});
  await settings.load();
  settings.watch();
  fake.listeners[0]({ enabled: { newValue: false } }, 'sync');
  assert.strictEqual(settings.isEnabled(), true);
});

test('watch ignores another key', async () => {
  const fake = installStorage({});
  await settings.load();
  settings.watch();
  fake.listeners[0]({ theme: { newValue: 'dark' } }, 'local');
  assert.strictEqual(settings.isEnabled(), true);
});
```

- [x] **Step 2: Run the test and confirm that it fails**

Run: `node --test`
Expected: FAIL. The message says that `src/settings.js` does not exist.

- [x] **Step 3: Write the code**

Create `src/settings.js`:

```js
(function (root) {
  'use strict';

  const KEY = 'enabled';
  const DEFAULT = true;
  let cached = DEFAULT;

  // Firefox and Chrome both answer with promises in Manifest version 3.
  function api() {
    return root.browser || root.chrome;
  }

  // Only an explicit false turns the extension off.
  function cache(value) {
    cached = value !== false;
    return cached;
  }

  function isEnabled() {
    return cached;
  }

  async function load() {
    try {
      const result = await api().storage.local.get(KEY);
      return cache(result ? result[KEY] : DEFAULT);
    } catch (error) {
      return cache(DEFAULT);
    }
  }

  async function save(value) {
    cache(value);
    const values = {};
    values[KEY] = cached;
    await api().storage.local.set(values);
  }

  function watch() {
    api().storage.onChanged.addListener(function (changes, area) {
      if (area !== 'local') return;
      if (!changes || !changes[KEY]) return;
      cache(changes[KEY].newValue);
    });
  }

  root.YtAmp = root.YtAmp || {};
  root.YtAmp.settings = {
    KEY: KEY,
    DEFAULT: DEFAULT,
    isEnabled: isEnabled,
    load: load,
    save: save,
    watch: watch
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [x] **Step 4: Run the test and confirm that it passes**

Run: `node --test`
Expected: PASS. All tests pass.

- [x] **Step 5: Commit**

```bash
git add src/settings.js test/settings.test.js
git commit -m "Add the settings module for the toolbar toggle"
```

---

### Task 4: The content script

**Files:**
- Create: `src/content.js`
- Create: `src/main.js`
- Test: `test/content.test.js`

**Interfaces:**
- Consumes: `YtAmp.shouldOpenMiniplayer` (Task 1), `YtAmp.page` (Task 2),
  `YtAmp.settings` (Task 3).
- Produces: `globalThis.YtAmp.content`, an object with these members:
  - `findLink(event) -> element or null`
  - `isPlainClick(event, link) -> boolean`
  - `buildState(event) -> object` — the state that Task 1 consumes.
  - `handleClick(event) -> undefined` — never throws.
  - `start() -> undefined` — subscribes to the settings, loads them, then
    arms the click listener. The listener must not arm before the load
    resolves. Otherwise an off toggle acts as on for a short time.

`src/main.js` calls `YtAmp.content.start()`. It holds no other code, so
the tests can load `src/content.js` without a side effect.

- [x] **Step 1: Write the failing test**

Create `test/content.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { fakeElement, installPage, define } = require('../support/helpers.js');

require('../src/decide.js');
require('../src/content.js');
const content = globalThis.YtAmp.content;

// Replaces the page and settings modules with stubs.
function installModules(options) {
  const opts = options || {};
  const opened = { count: 0 };
  globalThis.YtAmp.page = {
    isWatchPage() { return opts.onWatchPage !== false; },
    isQueueOpen() { return opts.queueOpen === true; },
    isMiniplayerOpen() { return opts.miniplayerOpen === true; },
    openMiniplayer() { opened.count += 1; }
  };
  globalThis.YtAmp.settings = {
    isEnabled() { return opts.enabled !== false; },
    load() { return Promise.resolve(true); },
    watch() {}
  };
  return opened;
}

// Builds a fake click event with a link in the composed path.
function clickEvent(options) {
  const opts = options || {};
  const link = opts.link === null ? null : fakeElement(Object.assign({
    tagName: 'A',
    href: 'https://www.youtube.com/@somechannel',
    attributes: { href: '/@somechannel' }
  }, opts.link));
  return {
    button: opts.button === undefined ? 0 : opts.button,
    ctrlKey: !!opts.ctrlKey,
    metaKey: !!opts.metaKey,
    shiftKey: !!opts.shiftKey,
    altKey: !!opts.altKey,
    composedPath() { return link ? [fakeElement({}), link] : [fakeElement({})]; }
  };
}

test('findLink returns the first anchor with an href', () => {
  installPage({});
  const event = clickEvent({});
  assert.strictEqual(content.findLink(event).tagName, 'A');
});

test('findLink returns null without an anchor', () => {
  installPage({});
  assert.strictEqual(content.findLink(clickEvent({ link: null })), null);
});

test('isPlainClick is true for a left click without a modifier', () => {
  const event = clickEvent({});
  assert.strictEqual(content.isPlainClick(event, content.findLink(event)), true);
});

test('isPlainClick is false for a middle click', () => {
  const event = clickEvent({ button: 1 });
  assert.strictEqual(content.isPlainClick(event, content.findLink(event)), false);
});

['ctrlKey', 'metaKey', 'shiftKey', 'altKey'].forEach((name) => {
  test('isPlainClick is false for ' + name, () => {
    const options = {};
    options[name] = true;
    const event = clickEvent(options);
    assert.strictEqual(content.isPlainClick(event, content.findLink(event)), false);
  });
});

test('isPlainClick is false for a link that opens a new tab', () => {
  const event = clickEvent({ link: { target: '_blank' } });
  assert.strictEqual(content.isPlainClick(event, content.findLink(event)), false);
});

test('buildState reads the destination path', () => {
  installPage({});
  installModules({});
  const state = content.buildState(clickEvent({}));
  assert.strictEqual(state.destinationPath, '/@somechannel');
  assert.strictEqual(state.sameHost, true);
  assert.strictEqual(state.hasLink, true);
  assert.strictEqual(state.plainClick, true);
});

test('buildState marks another host', () => {
  installPage({});
  installModules({});
  const event = clickEvent({ link: { href: 'https://example.com/page' } });
  assert.strictEqual(content.buildState(event).sameHost, false);
});

test('handleClick opens the miniplayer when every rule passes', () => {
  installPage({});
  const opened = installModules({});
  content.handleClick(clickEvent({}));
  assert.strictEqual(opened.count, 1);
});

test('handleClick stays silent when a queue is open', () => {
  installPage({});
  const opened = installModules({ queueOpen: true });
  content.handleClick(clickEvent({}));
  assert.strictEqual(opened.count, 0);
});

test('handleClick stays silent for a Cmd click', () => {
  installPage({});
  const opened = installModules({});
  content.handleClick(clickEvent({ metaKey: true }));
  assert.strictEqual(opened.count, 0);
});

test('handleClick stays silent for another watch page', () => {
  installPage({});
  const opened = installModules({});
  const event = clickEvent({ link: { href: 'https://www.youtube.com/watch?v=abc' } });
  content.handleClick(event);
  assert.strictEqual(opened.count, 0);
});

test('start arms the click listener only after the settings load', async () => {
  const dom = installPage({});
  installModules({});
  let finishLoad;
  globalThis.YtAmp.settings.load = function () {
    return new Promise(function (resolve) { finishLoad = resolve; });
  };
  content.start();
  assert.strictEqual(dom.listeners.length, 0);
  finishLoad(true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.strictEqual(dom.listeners.length, 1);
  assert.strictEqual(dom.listeners[0].type, 'click');
  assert.strictEqual(dom.listeners[0].capture, true);
});

test('handleClick never throws', () => {
  installPage({});
  installModules({});
  globalThis.YtAmp.page.isQueueOpen = function () {
    throw new Error('YouTube changed the DOM');
  };
  assert.doesNotThrow(() => content.handleClick(clickEvent({})));
});
```

- [x] **Step 2: Run the test and confirm that it fails**

Run: `node --test`
Expected: FAIL. The message says that `src/content.js` does not exist.

- [x] **Step 3: Write the content script**

Create `src/content.js`:

```js
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
```

- [x] **Step 4: Write the start file**

Create `src/main.js`:

```js
// The manifest loads this file last. It starts the content script.
globalThis.YtAmp.content.start();
```

- [x] **Step 5: Run the test and confirm that it passes**

Run: `node --test`
Expected: PASS. All tests pass.

- [x] **Step 6: Commit**

```bash
git add src/content.js src/main.js test/content.test.js
git commit -m "Add the content script that joins the click to the rule"
```

---

### Task 5: The manifest and the toolbar toggle

**Files:**
- Create: `manifest.json`
- Create: `popup.html`
- Create: `src/popup.js`

**Interfaces:**
- Consumes: `YtAmp.settings` (Task 3), and the content script files from
  Tasks 1, 2, 3, and 4.
- Produces: a loadable extension. Task 6 tests it by hand.

- [x] **Step 1: Write the manifest**

Create `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "YT Auto Miniplayer",
  "version": "0.1.0",
  "description": "Opens the YouTube miniplayer when you leave a watch page.",
  "permissions": ["storage"],
  "content_scripts": [
    {
      "matches": ["*://*.youtube.com/*"],
      "js": [
        "src/decide.js",
        "src/youtube-page.js",
        "src/settings.js",
        "src/content.js",
        "src/main.js"
      ],
      "run_at": "document_idle",
      "all_frames": false
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "YT Auto Miniplayer"
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "yt-auto-miniplayer@markkyaw",
      "strict_min_version": "115.0"
    }
  }
}
```

- [x] **Step 2: Write the popup markup**

Create `popup.html`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>YT Auto Miniplayer</title>
<style>
  body {
    font: 14px system-ui, sans-serif;
    margin: 0;
    padding: 14px 16px;
    min-width: 210px;
  }
  h1 { font-size: 14px; margin: 0 0 10px; }
  label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
  p { color: #666; font-size: 12px; margin: 10px 0 0; line-height: 1.4; }
</style>
</head>
<body>
  <h1>YT Auto Miniplayer</h1>
  <label>
    <input type="checkbox" id="toggle">
    <span>Automatic miniplayer</span>
  </label>
  <p>The video moves to the miniplayer when you leave a watch page.</p>
  <script src="src/settings.js"></script>
  <script src="src/popup.js"></script>
</body>
</html>
```

- [x] **Step 3: Write the popup behavior**

Create `src/popup.js`:

```js
(function () {
  'use strict';

  const settings = globalThis.YtAmp.settings;
  const toggle = document.getElementById('toggle');

  settings.load().then(function (enabled) {
    toggle.checked = enabled;
  });

  toggle.addEventListener('change', function () {
    settings.save(toggle.checked);
  });
})();
```

- [x] **Step 4: Confirm that the manifest is valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('manifest is valid')"`
Expected: `manifest is valid`

- [x] **Step 5: Confirm that every manifest file exists**

Run:
```bash
node -e "
const fs = require('fs');
const m = JSON.parse(fs.readFileSync('manifest.json','utf8'));
const files = m.content_scripts[0].js.concat([m.action.default_popup]);
files.forEach(f => { if (!fs.existsSync(f)) throw new Error('missing: ' + f); });
console.log('all ' + files.length + ' files exist');
"
```
Expected: `all 6 files exist`

- [x] **Step 6: Run the tests again**

Run: `node --test`
Expected: PASS. The new files break nothing.

- [x] **Step 7: Commit**

```bash
git add manifest.json popup.html src/popup.js
git commit -m "Add the manifest and the toolbar toggle"
```

---

### Task 6: The manual test in Firefox and the README

**Files:**
- Create: `README.md`
- Modify: `docs/superpowers/specs/2026-08-26-yt-auto-miniplayer-design.md`
  (section 10, the two open questions)

**Interfaces:**
- Consumes: the whole extension from Tasks 1 to 5.
- Produces: a recorded result for the back button and for Shorts.

**Note for the implementer:** You cannot load a Firefox add-on yourself.
Ask the user to run each case and to report the result. Do not claim a
pass that the user did not report.

- [x] **Step 1: Write the README**

Create `README.md`:

````markdown
# YT Auto Miniplayer

A Firefox and Chrome extension. It opens the YouTube miniplayer when you
leave a watch page. The video continues to play.

The extension stays silent when a queue or a playlist is active. YouTube
already keeps the video alive in that case.

## Install in Firefox for a test

1. Open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on**.
3. Select the `manifest.json` file in this folder.

Firefox removes a temporary add-on when it closes.

## Install in Chrome for a test

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Select **Load unpacked**, then select this folder.

## Turn the extension on or off

Select the toolbar button. The switch turns the behavior on or off. The
change applies at once. You do not need to reload the page.

## Run the tests

```
node --test
```

The tests need no installation. The project has no dependency.

## Repair a broken selector

YouTube can change its page at any time. Every selector is in
`src/youtube-page.js`. Change the value in `SELECTORS` and reload the
add-on.

## Design

Read `docs/superpowers/specs/2026-08-26-yt-auto-miniplayer-design.md`.
````

- [ ] **Step 2: Ask the user to load the extension**

Give the user the three steps from the README. Wait for the report.

- [ ] **Step 3: Ask the user to run each case and report the result**

| Case | Expected result |
|---|---|
| Watch a video, click the channel name | The miniplayer opens. The channel page loads. |
| Watch a video, click the YouTube logo | The miniplayer opens. The home page loads. |
| Watch a video, click a different video | No miniplayer. YouTube plays the new video. |
| Watch a video, Cmd+click a link | The video stays full size. A new tab opens. |
| Watch a video, middle-click a link | The video stays full size. A new tab opens. |
| Add two videos to the queue, click the channel name | The extension does nothing. YouTube opens its own miniplayer. |
| Open a video from a playlist, click the channel name | The extension does nothing. |
| Turn the toggle off, click the channel name | No miniplayer. The video stops. |
| Turn the toggle on again, click the channel name | The miniplayer opens. |
| Watch a video, click a Short | Record the result. Only one audio track must play. |
| Open a video in a fresh tab, click the channel name | Record the result. The `i` key has no earlier page. |
| Press the back button after the miniplayer opens | Record the page that loads. |

- [ ] **Step 4: Record the two open results in the spec**

The phrase "Record the result" is in the section 9.2 table. Section 10
holds the sentence "must record the exact result and report it". Replace
both with the real behavior that the user reported. If a Short plays two
audio tracks, open a new task to close the miniplayer first.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/superpowers/specs/2026-08-26-yt-auto-miniplayer-design.md
git commit -m "Add the README and record the manual test results"
```

- [ ] **Step 6: Ask the user, then push**

Ask the user for permission to push. The remote is public. Push only
after the user agrees.

```bash
git push -u origin main
```

---

## Coverage against the spec

| Spec section | Task |
|---|---|
| 3. Architecture | 5 |
| 4. Modules | 1, 2, 3, 4, 5 |
| 5. The rule | 1 |
| 5.1 The decision function | 1 |
| 5.2 The plain click test | 4 |
| 5.3 Page state signals | 2 |
| 5.4 The action | 2 |
| 6. Data flow | 4 |
| 7. Error handling | 4 |
| 8. The toggle | 3, 5 |
| 9.1 Unit tests | 1, 2, 3, 4 |
| 9.2 Manual tests | 6 |
| 10. Known limits | 6 |
