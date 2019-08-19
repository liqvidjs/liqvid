# ractive-player

This was originally developed just for my own personal use, and is in the process of being cleaned up for general use. For example, it does not always adhere to modern software "best practices" like unit testing or commenting one's code.

## Audio

The `start` attribute is either a number or the name of a marker. If you don't have multiple sources you can just stick `src` on Audio itself.

Example:

```JSX
<Audio start="speech">
  <source src={`${MEDIA_URL}/audio/speech.webm`} type="audio/webm"/>
  <source src={`${MEDIA_URL}/audio/speech.mp4`} type="audio/mp4"/>
</Audio>
```

`MEDIA_URL` would be "." in development and your assets host in production.

## Block

This is a slightly more opinionated `Player.PureReceiver`. You use it by having your component extend it. It will subscribe to `markerupdate` and `timeupdate`, via methods `onMarkerUpdate()` and `onTimeUpdate()` that you implement.

## Cursor

This should maybe be moved to a separate module.

## IdMap

Automagically adds attributes to things with IDs. This is mainly to enable GUI tools which will be developed elsewhere. This also broadcasts `Player`.

## Playback

This is the most important class. Imitates the [HTMLMediaElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement) interface to a certain extent.

## Player

Example:

```JSX
// media-url.ts
export default ".";

// markers.ts
export default [
  ["begin", "1:00"]
] as [string, string][];

// index.tsx
import {Player, Script} from "ractive-player";

import MEDIA_URL from "./media-url";
import markers from "./markers";

class Ractive extends React.PureComponent {
  async componentDidMount() {
    // deciding when a ractive is ready to go is complicated
    this.player.hub.on("canplay", () => {
      this.player.ready();
    }
  }

  render() {
    const script = new Script(markers);

    const highlights = [
    ];

    const thumbData = {
      cols: 5,
      rows: 5,
      height: 100,
      width: 160,
      frequency: 4,
      path: `${MEDIA_URL}/thumbs/%s.png`,
      highlights
    };
  
    return (
      <Player ref={player => this.player = player} script={script}>
        Hello World!
      </Player>
    );
  }
}

ReactDOM.render(<Ractive/>, document.querySelector("main"));
```

thumbs

script attribute

plugins for editor

stuff

ignoreCanvasClick

$controls

hub

also has playback and script

## Script

## Utils

Some of these are for internal use. You should probably only use `animation`, `authoring`, and `misc`.

### animation

Handy helpers for animation. Also exports shortcuts from https://easings.net/. You will need to use your own Bezier curve module though.

### authoring

You will use `from` a lot to control when things appear on screen. I have `_f + TAB` as a shortcut for `{...from("")}` in my editor. Occasionally `showIf` for more fine-grained control.

Note that `from` operates outside of React, so will work without its parent component being updated. However for `showIf` you will need to make sure the parent component is subscribing to `onTimeUpdate` or `onSlideUpdate`.

### graphics

Don't use this, it will be removed.

### interactivity

Helper for implementing drag functionality. This might get removed.

### media

This wraps [`canplay`]() and [`canplaythrough`]() events as Promises.

### misc

At one point in time this module was called KitchenSink. Basically just a hodgepodge of things that are helpful when authoring, i.e. polyfilling Javascript functions that should exist but don't. This is "bad programming practice" but makes the authoring experience easier. Conceivably could have more things in it as well; imagine the possibilities.

### react

This is for implementing `Player.Broadcaster` and `IdMap`. Don't use this.

### time

Parses and formats time.

## Video

Works the same as Audio except that you should style it with a height and width.
