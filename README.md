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
