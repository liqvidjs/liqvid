# Liqvid

[Liqvid](https://liqvidjs.org/) is a library for creating **interactive** videos in React.

## Links

[Documentation](https://liqvidjs.org/docs/)

[Discord](https://discord.gg/u8Qab99zHx)

## Repository structure

This is a monorepo. Here is what the various packages do:

### Frontend Core

* `main`  
Provides the main `liqvid` package.

* `host`  
Script for pages hosting Liqvid videos; currently just handles [fake fullscreen](https://liqvidjs.org/docs/guide/mobile#fake-fullscreen)

* `keymap`  
Provides the [`Keymap`](https://liqvidjs.org/docs/reference/Keymap) class

* `playback`  
Provides the [`Playback`](https://liqvidjs.org/docs/reference/Playback) class

* `polyfills`  
Polyfills for Liqvid videos; currently just handles [Web Animations](https://liqvidjs.org/docs/guide/mobile/#web-animations)

* `utils`  
Provides the various helper functions in [`Utils`](https://liqvidjs.org/docs/reference/Utils/animation)

### Backend Tools

* `cli`  
The Liqvid [CLI tool](https://liqvidjs.org/docs/cli/tool)

* `magic`  
Provides wacky[resource macro](https://liqvidjs.org/docs/cli/macros) syntax

* `renderer`  
Handles the [`audio`](https://liqvidjs.org/docs/cli/audio), [`build`](https://liqvidjs.org/docs/cli/build), [`render`](https://liqvidjs.org/docs/cli/render), and [`thumbs`](https://liqvidjs.org/docs/cli/thumbs) CLI commands

* `serve`  
Development server; provides the [`serve`](https://liqvidjs.org/docs/cli/tool) CLI command

### Integrations

* `katex`  
Provides [KaTeX integration](https://liqvidjs.org/docs/integrations/katex)

* `react-three`  
Provides [React Three Fiber](https://liqvidjs.org/docs/integrations/three) integration

### In-development

* `captioning`  
Captions editor

* `gsap`  
[GSAP](https://greensock.com/gsap/) integration (maybe already works???)

* `i18n`  
Internationalization utilities

* `player`  
New Web Components-based `<Player>`

* `mathjax`  
[MathJax](https://www.mathjax.org/) integration

* `react`  
Probably for when Liqvid goes to Web Components (v3)

* `xyjax`  
[XyJax](https://github.com/sonoisa/XyJax-v3/) integration
