# YT Auto Miniplayer - Design

Date: 2026-08-26
Status: Approved

## 1. Purpose

A browser extension for Firefox and Chrome. It opens the YouTube
miniplayer when the user leaves a watch page. The video continues to
play. Today the user must press `i` by hand before each navigation.

The extension stays silent when a queue or a playlist is active.
YouTube already keeps the video alive in that case.

Firefox is the first target. Chrome uses the same code.

## 2. Probe results

A console probe in Firefox proved these facts on 2026-08-26. The
design depends on them.

| Fact | Result |
|---|---|
| Synthetic `i` key on `document` | Opens the miniplayer. YouTube accepts the untrusted event. |
| "Enter miniplayer" button in the control bar | Does not exist. Only an "Expand" button inside the miniplayer. |
| Ad-hoc queue ("Add to queue") | Sets no `list=` URL parameter. |
| Playlist and ad-hoc queue | Both make `#playlist.ytd-watch-flexy` lose its `hidden` attribute. |
| Miniplayer open state | Read the visibility of `ytd-miniplayer`. The `active` attribute does not exist. |
| `yt-navigate-start` at the capture phase | `location` still holds the old URL. |
| Press `i`, then let the click navigate | The user lands on the clicked page. The miniplayer stays open. |

## 3. Architecture

The extension is a content script only. It has no background script.

- Manifest version 3. One manifest serves both browsers.
- Host match: `*://*.youtube.com/*`.
- Permission: `storage`. The toggle needs it. Nothing else.
- Firefox needs `browser_specific_settings.gecko.id`. Chrome ignores
  that key.

The trigger is a capture-phase `click` listener on `document`. The
listener runs before any navigation. The clicked link carries the
destination, so the extension does not read `location`.

The listener never calls `preventDefault()`. A failure can never block
the user's click.

## 4. Modules

| File | Purpose |
|---|---|
| `src/youtube-page.js` | Holds every YouTube selector. Reads the page state. Sends the key event. |
| `src/decide.js` | One pure function. State in, boolean out. No DOM. |
| `src/content.js` | Reads the click. Builds the state. Calls `decide`. Calls the page module. |
| `src/settings.js` | Reads and writes the toggle in `storage.local`. |
| `popup.html`, `src/popup.js` | The toolbar toggle. |
| `manifest.json` | The extension manifest. |
| `test/decide.test.js` | The unit tests for `src/decide.js`. |

The manifest loads the content scripts in this order: `src/decide.js`,
`src/youtube-page.js`, `src/settings.js`, `src/content.js`. Each file
adds one property to the global object `YtAmp`.

The extension calls the browser through one alias:
`const api = globalThis.browser || globalThis.chrome;`. Firefox and
Chrome both return promises for `storage.local` in Manifest version 3.

`src/youtube-page.js` is the only file that breaks when YouTube changes
its DOM. All selectors live there.

`src/decide.js` depends on nothing. All unit tests target this file.

## 5. The rule

The extension sends the `i` key when all of these are true:

1. The toggle is on.
2. The current path is `/watch`.
3. The click landed on a link with an `href`.
4. The link points to the same host.
5. The destination path is not `/watch`.
6. The queue panel is closed.
7. The miniplayer is not open.

If one test fails, the extension does nothing.

### 5.1 The decision function

A content script cannot use `import`. Manifest V3 does not support ES
modules in a content script. The manifest lists each file in order.
Each file attaches its exports to one global object.

```js
// src/decide.js
(function (root) {
  function shouldOpenMiniplayer(state) { /* returns true or false */ }
  root.YtAmp = root.YtAmp || {};
  root.YtAmp.shouldOpenMiniplayer = shouldOpenMiniplayer;
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

Node can load the same file. The test file loads it with `require`,
then reads `globalThis.YtAmp.shouldOpenMiniplayer`. The project needs
no build step.

`state` holds these fields:

| Field | Type | Meaning |
|---|---|---|
| `enabled` | boolean | The toolbar toggle. |
| `onWatchPage` | boolean | The current path is `/watch`. |
| `hasLink` | boolean | The click hit a link with an `href`. |
| `sameHost` | boolean | The link points to the current host. |
| `destinationPath` | string | The path of the link. |
| `queueOpen` | boolean | A queue or a playlist is active. |
| `miniplayerOpen` | boolean | The miniplayer is open now. |

### 5.2 Page state signals

| Signal | Test |
|---|---|
| `onWatchPage` | `location.pathname === '/watch'` |
| `queueOpen` | `#playlist.ytd-watch-flexy` exists and has no `hidden` attribute |
| `miniplayerOpen` | `ytd-miniplayer` exists, `offsetParent` is not null, and the width is more than 0 |

### 5.3 The action

The page module sends three events to `document`: `keydown`,
`keypress`, and `keyup`. Each event uses `key: 'i'`, `code: 'KeyI'`,
`keyCode: 73`, `bubbles: true`, `cancelable: true`, `composed: true`.

## 6. Data flow

1. The user clicks a link on a watch page.
2. The capture-phase listener reads the click.
3. `content.js` finds the link with `event.composedPath()`.
4. `content.js` reads the page state from `youtube-page.js`.
5. `content.js` calls `shouldOpenMiniplayer(state)`.
6. If the answer is `true`, `youtube-page.js` sends the key events.
7. The click continues. YouTube navigates to the destination.
8. The miniplayer stays open and the video plays.

## 7. Error handling

The whole listener body sits in a `try`/`catch`. The `catch` block
ignores the error. The extension must never block a navigation.

If a selector finds no element, the state field is `false`. The rule
then fails and the extension does nothing.

## 8. The toggle

The toolbar button opens a small popup. The popup shows one switch.

The switch writes `{ enabled: true }` or `{ enabled: false }` to
`storage.local`. The default value is `true`.

`src/settings.js` reads the value at start. It also listens to
`storage.onChanged`, so a change applies at once. `src/content.js`
reads the current value from `src/settings.js`. The user does not need
to reload the page.

If `storage.local` holds no value, the extension uses `true`.

## 9. Testing

### 9.1 Unit tests

`node --test` runs the tests for `src/decide.js`. The tests cover:

- All conditions pass. The result is `true`.
- `enabled` is false. The result is `false`.
- `onWatchPage` is false. The result is `false`.
- `hasLink` is false. The result is `false`.
- `sameHost` is false. The result is `false`.
- `destinationPath` is `/watch`. The result is `false`.
- `queueOpen` is true. The result is `false`.
- `miniplayerOpen` is true. The result is `false`.

The tests come first. The code comes after.

### 9.2 Manual tests in Firefox

Load the extension through `about:debugging` → Load Temporary Add-on.
Then check these cases by hand:

| Case | Expected result |
|---|---|
| Watch a video, click the channel name | The miniplayer opens. The channel page loads. |
| Watch a video, click the YouTube logo | The miniplayer opens. The home page loads. |
| Watch a video, click a different video | No miniplayer. YouTube plays the new video. |
| Add two videos to the queue, click the channel name | The extension does nothing. YouTube opens its own miniplayer. |
| Open a video from a playlist, click the channel name | The extension does nothing. |
| Turn the toggle off, click the channel name | No miniplayer. The video stops. |
| Press the back button after a navigation | Record the result. See section 10. |

A mocked DOM cannot prove that the extension works. The manual test is
the proof.

## 10. Known limits

- The extension covers link clicks only. The back button, the forward
  button, and a typed URL are not covered. A full page load stops the
  video. No extension can prevent that.
- The `i` key makes YouTube navigate back one step first. The history
  gains one entry: the watch page, the earlier page, then the
  destination. The implementation must record the back-button result
  and report it.
- Shorts, embeds, and YouTube Music have no miniplayer. The key event
  has no effect there. The extension reports no error.
- YouTube can change its DOM at any time. All selectors live in
  `src/youtube-page.js` for a fast repair.

## 11. Out of scope for version 1

- Chrome packaging and the Chrome Web Store listing. The code supports
  Chrome. The release does not.
- An options page with rules per page type.
- Support for the back button and the forward button.
- A change to the behavior when the user arrives at a watch page. The
  extension acts in one direction only.
