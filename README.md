# ractive-player

This is a library for playing interactive videos using HTML/CSS/Javascript (and React). Here are some examples:

[Computing cos and sin](https://lmqm.xyz/a/9vb/computing_cos_and_sin)

[Points and vectors](https://lmqm.xyz/a/w7s/points_and_vectors)

To author these you will also need [ractive-editor](https://github.com/ysulyma/ractive-editor/).

For documentation, see the [wiki](https://github.com/ysulyma/ractive-player/wiki).

## Audio

The `start` attribute is either a number or the name of a marker. If you don't have multiple sources you can just stick `src` on Audio itself.

Example:

```JSX
<Audio start="speech">
  <source src={`${MEDIA_URL}/audio/intro.webm`} type="audio/webm"/>
  <source src={`${MEDIA_URL}/audio/intro.mp4`} type="audio/mp4"/>
</Audio>
```

`MEDIA_URL` would be "." in development and your assets host in production.

## Cursor

For replaying cursor movements (although you could use any image). Once we have a proper plugin system this will be moved to its own package.

This component is deprecated and will be removed in a future major version. You should use [rp-cursor](https://github.com/ysulyma/rp-cursor) instead.

## IdMap

Automagically adds attributes to things with IDs. This is mainly to enable GUI tools which will be developed elsewhere.

## Playback

This is the most important class. Imitates the [HTMLMediaElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement) interface to a certain extent.

## Player

Example:

```JSX
// media-url.ts
export default ".";

// markers.ts
export default [
  ["begin", "1:00"],
  ["world", "1:00"]
] as [string, string][];

// index.tsx
import {Player, Script, Utils} from "ractive-player";
const {from} = Utils.authoring;

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
      {title: "World", time: script.markerByName("world")[1]}
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
        Hello <span {...from("world")}>World!</span>
      </Player>
    );
  }
}

ReactDOM.render(<Ractive/>, document.querySelector("main"));
```

## Script

## Utils

Some of these are for internal use. You should probably only use `animation`, `authoring`, `interactivity`, `misc`, and `mobile`.

### animation

Handy helpers for animation. Also exports shortcuts from https://easings.net/. You will need to use your own Bezier curve module though.

### authoring

You will use `during` and `from` a lot to control when things appear on screen. Occasionally `showIf` for more fine-grained control.

Note that `during` and `from` operate outside of React, so will work without the parent component being updated. However for `showIf` you will need to make sure the parent component is subscribing to `onTimeUpdate` or `onMarkerUpdate`.

### interactivity

Helper for implementing drag functionality.

### media

This wraps [`canplay`]() and [`canplaythrough`]() events as Promises.

### misc

Assorted helper functions.

### mobile

Helper functions for dealing with mobile quirks.

### react

This is for implementing `IdMap`. Don't use this.

### time

Parses and formats time.

## Video

Works the same as Audio except that you should style it with a height and width.
