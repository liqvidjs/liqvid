## 2.0.0 (Dec 31, 2020)

* remove Cursor; use [rp-cursor](https://www.npmjs.com/package/rp-cursor) instead

* rename `Player.$controls` -> `Player.controls`

* remove `Player.CONTROLS_HEIGHT`

* support ordinary events in `Player.preventCanvasClick`

* added `Player.allowScroll`

* added `Script.parseStart` and `Script.parseEnd`

* added `Utils.time.timeRegexp`

* added `Utils.replayData`

* added some documentation

* workaround for https://github.com/facebook/react/issues/2043 affecting Android (now fixed in React v.17)

* added `Utils.react.captureRef`

* added `useMarkerUpdate`, `usePlayer`, `useTimeUpdate` hooks

* added `rp-volume-color` CSS variable

* removed `rememberVolumeSettings` due to cookie laws

* added `KeyMap`

* removed plugin system and "hooks" system (easily confused with React's Hooks); added `Player.props.controls` and `Player.defaultControls*` to replace

* removed `LoadingScreen`

* added `Player.reparseTree`

## 1.1.1 (October 20, 2019)

* fix typings for `utils/animation/replay`

## 1.1.0 (October 20, 2019)

* add `attachClickHandler` in `utils/mobile`

## 1.0.3 (October 20, 2019)

* better mobile scrubbing

* remove external fonts

* work around opacity bug on Safari

## 1.0.2 (September 6, 2019)

* use `StrictEventEmitter` for better typing

## 1.0.1 (September 2, 2019)

* specify `files` correctly in `package.json`

## 1.0.0 (September 2, 2019)

First stable release

## 0.8.0 (November 9, 2018)

Initial public release
