## 2.1.18 (April 27, 2025)

- fix `Script` type to be readonly + allow narrowing the marker name

## 2.1.17 (February 4, 2025)

- fix ESM exports

## 2.1.15 (January 24, 2025)

- fix `StrictMode` error in `<CaptionsDisplay>`

## 2.1.14 (January 23, 2025)

- make `Player.symbol` indexable via `@liqvid/player/element`

## 2.1.12 (June 12, 2024)

- Strict Mode fixes

## 2.1.10 (June 6, 2024)

- make compatible with Next.js / SSR

## 2.1.9 (November 13, 2022)

- `<Audio>`/`<Video>` will seek to their end when `Playback` is seeked past their end

- `<Audio>`/`<Video>` will restart when `Playback` plays from ended

- `Playback` will fire `stop` and restart correctly when seeked to end (vs played to end)

- `Keymap` no longer throws Errors when calling `unbind()` with an unbound callback

## 2.1.8 (October 29, 2022)

- fix `<Audio>`/`<Video>` pausing playback on end (#31)

## 2.1.7 (May 14, 2022)

- support React 18

## 2.1.6 (May 6, 2022)

- ensure `Player.Context` is always the same even if multiple versions of Liqvid are accidentally loaded

## 2.1.5 (May 4, 2022)

- allow passing numeric durations to `Script` (fixes #26)

## 2.1.4 (March 15, 2022)

- don't crash when `Playback` isn't polyfilled

- update repository URL

## 2.1.3 (March 13, 2022)

- fix `fake-fullscreen` origin

## 2.1.2 (March 13, 2022)

- use Rollup instead of Webpack

- correctly transpile dependencies for old browsers

## 2.1.1 (March 12, 2022)

- fix typings in `package.json`

## 2.1.0 (March 12, 2022)

### New features

- add `Playback.timeline` and `Playback.newAnimation` for much easier animation

- add `Utils.json` and `Utils.svg`

- add `Utils.react.combineRefs`

- put `Utils.animation.bezier` and `Utils.animation.easings` back in

- add `useKeymap`, `usePlayback`, `useScript` hooks

- add `useTime` hook

- distribute as ES module

### Ease-of-use

- `start` prop on `<Audio>` and `<Video>` elements now defaults to `0`

- add defaults to `thumbs` prop

- attach events directly to `Playback` and `Script` instead of `.hub`

- can now use `Player` without `Script`

- add `--lv-canvas-height` CSS variable

- add `data-affords="click"` for cancelling `canvasClick`

### Miscellaneous

- rename library to Liqvid

- expose `Media` class

- expose `ScrubberBar` control

- improve captions support, add captions control

- rename `KeyMap` to `Keymap`

- move most internals to `@liqvid` namespace

## 2.0.10 (Jul 19, 2021)

- add `playsInline` to `<Video>`

## 2.0.9 (Jul 19, 2021)

- fix bug introduced in 2.0.6 where Media ending would pause playback

## 2.0.8 (Jul 19, 2021)

- fix bug where scrubber keys could not be properly reassigned

- fix normalization in Script constructor

## 2.0.7 (Jul 7, 2021)

- package as UMD

## 2.0.6 (Jun 7, 2021)

- work correctly with keyboard play/pause buttons

- make scrubber bar work on desktop touchscreens

- no longer necessary to call `.ready()`, now a noop

- more intelligent canvasClick/keyCapture behavior

- enable captions

## 2.0.5 (May 28, 2021)

- correctly remove listeners when unmounting `<Audio>`/`<Video>`

- remove silly `<Video>` hiding behavior

- add `Script.playback` to typings

## 2.0.4 (May 9, 2021)

- fix bug in `KeyMap.normalize` + mistyping as `KeyMap.canonize`

## 2.0.2/2.0.3 (Jan 22, 2021)

- fix bug in mobile styling

## 2.0.1 (Jan 10, 2021)

- `KeyMap.getHandlers` will return `[]` on unbound sequences instead of throwing error

## 2.0.0 (Dec 31, 2020)

- remove Cursor; use [rp-cursor](https://www.npmjs.com/package/rp-cursor) instead

- rename `Player.$controls` -> `Player.controls`

- remove `Player.CONTROLS_HEIGHT`

- support ordinary events in `Player.preventCanvasClick`

- added `Player.allowScroll`

- added `Script.parseStart` and `Script.parseEnd`

- added `Utils.time.timeRegexp`

- added `Utils.replayData`

- added some documentation

- workaround for https://github.com/facebook/react/issues/2043 affecting Android (now fixed in React v.17)

- added `Utils.react.captureRef`

- added `useMarkerUpdate`, `usePlayer`, `useTimeUpdate` hooks

- added `rp-volume-color` CSS variable

- removed `rememberVolumeSettings` due to cookie laws

- added `KeyMap`

- removed plugin system and "hooks" system (easily confused with React's Hooks); added `Player.props.controls` and `Player.defaultControls*` to replace

- removed `LoadingScreen`

- added `Player.reparseTree`

- allowed `Utils.misc.range` to take two arguments

## 1.1.1 (October 20, 2019)

- fix typings for `utils/animation/replay`

## 1.1.0 (October 20, 2019)

- add `attachClickHandler` in `utils/mobile`

## 1.0.3 (October 20, 2019)

- better mobile scrubbing

- remove external fonts

- work around opacity bug on Safari

## 1.0.2 (September 6, 2019)

- use `StrictEventEmitter` for better typing

## 1.0.1 (September 2, 2019)

- specify `files` correctly in `package.json`

## 1.0.0 (September 2, 2019)

First stable release

## 0.8.0 (November 9, 2018)

Initial public release
