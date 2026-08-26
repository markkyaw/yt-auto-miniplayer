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

Select the toolbar button. The popup shows two switches.

| Switch | Effect | Default |
|---|---|---|
| Automatic miniplayer | The miniplayer opens when you click a link away from a watch page. | On |
| Also on the back button | The miniplayer opens when you press the back button on a watch page. | On |

The first switch gates both behaviors. The second switch appears only
while the first switch is on.

A change applies at once. You do not need to reload the page.

## Run the tests

```
node --test
```

The tests need no installation. The project has no dependency.

## The icon

`icons/icon.svg` is the source. The manifest points to the four PNG
files next to it, because Chrome does not accept an SVG icon.

To build the PNG files again after a change to the SVG:

```
qlmanage -t -s 512 -o icons icons/icon.svg
for s in 16 32 48 128; do
  cp icons/icon.svg.png icons/icon-$s.png
  sips -z $s $s icons/icon-$s.png
done
rm icons/icon.svg.png
```

## Repair a broken selector

YouTube can change its page at any time. Every selector is in
`src/youtube-page.js`. Change the value in `SELECTORS` and reload the
add-on.

## Design

Read `docs/superpowers/specs/2026-08-26-yt-auto-miniplayer-design.md`.
