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

A second probe on 2026-08-26 measured the back navigation.

| Fact | Result |
|---|---|
| `popstate` on a back navigation | Fires about 16 ms before `yt-navigate-start`. `location` already holds the destination. |
| The player at `popstate` | Still alive and playing. YouTube resets it to `t=0` and paused about 140 ms later. |
| Synthetic `i` inside the `popstate` handler | The video keeps playing. 5 clean trials out of 5. |
| `history.length` across the back press and the `i` key | Never changes. The `i` key costs no history entry. |
| `ytd-miniplayer` when the miniplayer is open | `position: fixed`, so `offsetParent` is always `null`. |
| The video element when the miniplayer is open | `video.closest('ytd-miniplayer')` returns the miniplayer. |
| A second `i` key while the miniplayer holds the video | YouTube expands the miniplayer, pushes a history entry, and resets the video. |

A third probe on 2026-08-26 measured Chrome. Chrome and Firefox differ.

| Fact | Result |
|---|---|
| YouTube's own `popstate` handler in Chrome | It stops the player inside the handler, before the extension runs. The stack is `handlePopstate` to `onYtStopOldPlayer` to `stopPlayer` to `cancelPlayback`. |
| The player at `popstate` in Chrome | Already `t=0` and paused. Firefox keeps it alive for about 140 ms more. |
| The `navigate` event of the Navigation API | Runs before YouTube's `popstate` handler. `location` still holds `/watch` and the video still plays. |
| The synthetic `i` key inside `navigate` | The video keeps playing in the miniplayer. |
| The `i` key seen from the Navigation API | It fires a second `navigate` event of type `push`. |
| The Chrome home page | It runs a second, muted preview player. A page can hold more than one `video` element. |

## 3. Architecture

The extension is a content script only. It has no background script.

- Manifest version 3. One manifest serves both browsers.
- Host match: `*://www.youtube.com/*` and `*://youtube.com/*`.
  The pattern leaves out every other subdomain, so the content
  script never runs on `music.youtube.com`, `m.youtube.com`, or
  `studio.youtube.com`.
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
| `src/back.js` | Reads the back navigation. Builds the state. Calls `decide`. Calls the page module. |
| `src/watch-timer.js` | Counts the seconds on the current watch page. |
| `src/settings.js` | Reads and writes the two toggles in `storage.local`. |
| `popup.html`, `src/popup.js`, `src/popup-main.js` | The two toolbar toggles. |
| `manifest.json` | The extension manifest. |
| `test/*.test.js` | The unit tests, one file per module. |

The manifest loads the content scripts in this order: `src/decide.js`,
`src/youtube-page.js`, `src/settings.js`, `src/back.js`,
`src/content.js`, `src/main.js`. Each file adds one property to the
global object `YtAmp`.

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
4. The click is a plain left click. See section 5.2.
5. The link points to the same host.
6. The destination path is not `/watch` and not `/shorts/...`.
7. The queue panel is closed.
8. The miniplayer is not open.

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
| `plainClick` | boolean | A plain left click. See section 5.2. |
| `sameHost` | boolean | The link points to the current host. |
| `destinationPath` | string | The path of the link. |
| `queueOpen` | boolean | A queue or a playlist is active. |
| `miniplayerOpen` | boolean | The miniplayer is open now. |

### 5.2 The plain click test

A modifier click or a middle click opens a new tab. The current tab
does not navigate. The extension must stay silent in that case.

`plainClick` is true only when all of these are true:

- `event.button === 0`
- `event.ctrlKey`, `event.metaKey`, `event.shiftKey`, and
  `event.altKey` are all false
- The link has no `target="_blank"`

Without this test the extension minimizes the video that the user
wanted to keep. That result is worse than no extension.

### 5.3 Page state signals

| Signal | Test |
|---|---|
| `onWatchPage` | `location.pathname === '/watch'` |
| `queueOpen` | `#playlist.ytd-watch-flexy` exists and has no `hidden` attribute |
| `miniplayerOpen` | `video.closest('ytd-miniplayer')` returns an element |
| `videoPlaying` | A `video` element exists and `paused` is `false` |
| `secondsOnPage` | The seconds since the current watch page opened |

The miniplayer uses `position: fixed`. A fixed element always reports
`offsetParent === null`, so a visibility test on `ytd-miniplayer` fails
for a miniplayer that is open. The test asks where the video sits.

### 5.4 The action

The page module sends three events to `document`: `keydown`,
`keypress`, and `keyup`. Each event uses `key: 'i'`, `code: 'KeyI'`,
`keyCode: 73`, `bubbles: true`, `cancelable: true`, `composed: true`.

### 5.5 The back navigation rule

The extension uses the `navigate` event of the Navigation API. That
event runs before YouTube's own `popstate` handler. `location` still
holds `/watch`, and the player still plays.

The choice matters in Chrome. YouTube stops the player inside its own
`popstate` handler, so a `popstate` listener always arrives too late.
Firefox stops the player about 140 ms later, so both hooks work there.

`src/back.js` uses `popstate` only when the browser has no Navigation
API. It never arms both hooks. Two hooks would send the `i` key twice.

The `navigate` handler acts only when all of these are true:

- The navigation type is `traverse`. The `i` key makes a `push`, and
  that must not start the handler again.
- The destination index is lower than the current index. A step
  forward is not a back press.
- `location.pathname` is still `/watch`.

The destination path comes from `event.destination.url`, because
`location` has not moved yet.

`shouldOpenMiniplayerOnBack(state)` returns `true` when all of these
are true:

1. The main toggle is on.
2. The back toggle is on.
3. A video plays.
4. The visit to the watch page is longer than `minimumSeconds`.
5. The destination path is not `/watch` and not a Short.
6. No queue or playlist is open.
7. The miniplayer does not hold the video already.

Rule 7 carries the feature. A second `i` key expands the miniplayer,
pushes a history entry, and stops the video.

The handler keeps no state between navigations. Every signal comes
from the page at `popstate` time.

## 6. Data flow

1. The user clicks a link on a watch page.
2. The capture-phase listener reads the click.
3. `content.js` finds the link with `event.composedPath()`.
4. `content.js` reads the page state from `youtube-page.js`.
5. `content.js` calls `shouldOpenMiniplayer(state)`.
6. If the answer is `true`, `youtube-page.js` sends the key events.
7. The click continues. YouTube navigates to the destination.
8. The miniplayer stays open and the video plays.

The back navigation follows a second path:

1. The user presses the back button on a watch page.
2. The `navigate` listener runs. `location` still holds `/watch`.
3. `back.js` reads the destination from `event.destination.url`.
4. `back.js` reads the page state from `youtube-page.js`.
5. `back.js` calls `shouldOpenMiniplayerOnBack(state)`.
6. If the answer is `true`, `youtube-page.js` sends the key events.
7. YouTube renders the destination page. The video keeps playing in
   the miniplayer.

## 7. Error handling

The whole listener body sits in a `try`/`catch`. The `catch` block
ignores the error. The extension must never block a navigation.

If a selector finds no element, the state field is `false`. The rule
then fails and the extension does nothing.

## 8. The toggles

The toolbar button opens a small popup. The popup shows two switches.

| Key in `storage.local` | Switch | Default |
|---|---|---|
| `enabled` | Automatic miniplayer | `true` |
| `backOpensMiniplayer` | Also on the back button | `true` |
| `minimumSeconds` | Only after N seconds on the page | `5` |

`src/watch-timer.js` samples `location.href` every second. A new URL
restarts the clock. The module reads no YouTube event, so a change to
the YouTube page cannot break it. A sample can be up to one second
late, which makes the count shorter, never longer.

The rule applies to the back button only. A link click opens the
miniplayer at once, with no minimum time.

The second switch is hidden while the first switch is off. The seconds
field is hidden while the second switch is off. The popup
hides it at once, with no reload. A hidden switch keeps its stored
value.

The `enabled` key gates both paths. The `backOpensMiniplayer` key
gates the back path only.

`src/settings.js` reads both keys at start. It also listens to
`storage.onChanged`, so a change applies at once. `src/content.js` and
`src/back.js` read the current values from `src/settings.js`. The user
does not need to reload the page.

If `storage.local` holds no value for a key, the extension uses the
default. Only an explicit `false` turns a switch off. A value of
`minimumSeconds` that is not a number, or is below zero, falls back to
`5`. So the rule always has a number.

## 9. Testing

### 9.1 Unit tests

`node --test test/` runs the tests for `src/decide.js`. The test file
loads the code with `require`. The project has no `package.json`, so
Node treats the files as CommonJS. The tests cover:

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
| Watch a video, Cmd+click or middle-click a link | The video keeps playing full size. A new tab opens. |
| Watch a video, click a Short | Record the result. One audio track only. |
| Open a video in a fresh tab, then click the channel name | Record the result. The `i` key has no earlier page. |
| Add two videos to the queue, click the channel name | The extension does nothing. YouTube opens its own miniplayer. |
| Open a video from a playlist, click the channel name | The extension does nothing. |
| Turn the toggle off, click the channel name | No miniplayer. The video stops. |
| Turn the main toggle off | The back row disappears from the popup. |
| Watch a video for 10 seconds, press the back button | The previous page loads. The video keeps playing in the miniplayer. |
| Open a video and press the back button within 5 seconds | No miniplayer. The video stops. |
| Set the field to 0, open a video, press back at once | The miniplayer opens. |
| Turn the back switch off | The seconds field disappears from the popup. |
| Press the back button a second time | No change to the video. The page moves back one more step. |
| Turn the back toggle off, press the back button | No miniplayer. The video stops. |
| Watch a video from a queue, press the back button | The extension does nothing. |

A mocked DOM cannot prove that the extension works. The manual test is
the proof.

## 10. Known limits

- The extension covers link clicks and the back button. The forward
  button and a typed URL are not covered. A full page load stops the
  video. No extension can prevent that.
- The `i` key costs no history entry. It replaces the current entry.
  So the back path needs no history correction.
- A browser without the Navigation API uses `popstate`. That hook
  works in Firefox. It does not work in Chrome, because YouTube stops
  the player first.
- The extension covers the back button only. A step forward through
  the history still stops the video.
- A second `i` key while the miniplayer holds the video expands the
  miniplayer and stops the video. The `miniplayerOpen` signal blocks
  that case. The signal must stay correct.
- Shorts and embeds have no miniplayer. The key event has no effect
  there. The extension reports no error.
- The extension does not run on YouTube Music. The match pattern
  leaves that subdomain out.
- YouTube can change its DOM at any time. All selectors live in
  `src/youtube-page.js` for a fast repair.

## 11. Out of scope for version 1

- Chrome packaging and the Chrome Web Store listing. The code supports
  Chrome. The release does not.
- An options page with rules per page type.
- Support for the forward button.
- A change to the behavior when the user arrives at a watch page. The
  extension acts in one direction only.
