# @lqv/playback

This module is used internally by the [Liqvid plugin suite](https://liqvidjs.org/docs/plugins/recording). Primarily, it provides a `MediaElement` interface, which is a sub-interface of [`HTMLMediaElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement), for plugins to sync up with. It also provides React hooks to access the ambient `MediaElement`.

The `Playback` interface in this module is deprecated, and kept for backwards compatibility with Liqvid.