# YT Auto Miniplayer

A Firefox and Chrome extension. It opens the YouTube miniplayer when you
leave a watch page. The video continues to play.

The extension also keeps the video alive when you press the back
button on a watch page.

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

Select the toolbar button. The popup shows two switches and one field.

| Control                          | Effect                                                                       | Default |
| -------------------------------- | ---------------------------------------------------------------------------- | ------- |
| Automatic miniplayer             | The video moves to the miniplayer when you switch to a different page        | On      |
| Also on the back button          | The video moves to the miniplayer when you press the back button             | On      |
| Only after N seconds on the page | The back button acts only when you stayed on the watch page longer than N    | 5       |

The first switch gates every behavior. The second switch appears only
while the first switch is on. The seconds field appears only while the
second switch is on.

The seconds rule applies to the back button only. A link click opens
the miniplayer at once. A value of 0 turns the minimum off.

A change applies at once. You do not need to reload the page.

## Run the tests

```
node --test
```

The tests need no installation. The project has no dependency.

## Build the file to upload

```
./tools/package.sh
```

The script runs the unit tests, checks that every file the manifest
names exists, and writes `dist/yt-auto-miniplayer-<version>.zip`. The
version comes from `manifest.json`.

The ZIP file holds `manifest.json` at the top level, with `src/`,
`icons/`, and `popup.html`. It leaves out `docs/`, `test/`,
`support/`, `tools/`, and the git data.

Upload the same file to both stores:

- Firefox: addons.mozilla.org → Submit a New Add-on.
- Chrome: the Developer Dashboard → Add new item.

## Where the extension runs

The content script runs on `www.youtube.com` and `youtube.com` only.
It does not run on `music.youtube.com`, `m.youtube.com`, or
`studio.youtube.com`.

## The icon

The manifest names four square PNG files in `icons/`: 16, 32, 48, and
128 pixels. `icons/yt_auto_pip.svg` is the same artwork in vector
form. The manifest does not name it, because Chrome does not accept an
SVG icon.

## Repair a broken selector

YouTube can change its page at any time. Every selector is in
`src/youtube-page.js`. Change the value in `SELECTORS` and reload the
add-on.

## Design

Read `docs/superpowers/specs/2026-08-26-yt-auto-miniplayer-design.md`.
