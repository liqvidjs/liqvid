import type {ScriptData, StyleData} from "./types";

export const scripts: Record<string, ScriptData> = {
  host: "https://cdn.jsdelivr.net/npm/@liqvid/host/lv-host.js",
  liqvid: {
    crossorigin: true,
    development: "https://cdn.jsdelivr.net/npm/liqvid@2.1.4/dist/liqvid.js",
    production: "https://cdn.jsdelivr.net/npm/liqvid@2.1.4/dist/liqvid.min.js",
    integrity:
      "sha384-o8Svf9aNpbI8MzaCkJ0rPo5OxnnZ9Zf86Z18azwsy6rPuenc22zYvNwyv49wIgWa",
  },
  livereload: {},
  polyfills: "https://cdn.jsdelivr.net/npm/@liqvid/polyfills/dist/waapi.js",
  rangetouch: {
    crossorigin: true,
    development: "https://cdn.rangetouch.com/2.0.1/rangetouch.js",
    integrity:
      "sha384-ImWMbbJ1rSn1mn+2vsKm/wN6Vc7hPNB2VKN0lX3FAzGK+c7M2mD6ZZcwknuKlP7K",
    production: "https://cdn.rangetouch.com/2.0.1/rangetouch.js",
  },
  react: {
    crossorigin: true,
    development: "https://cdn.jsdelivr.net/npm/react@17.0.2/umd/react.development.js",
    production: "https://cdn.jsdelivr.net/npm/react@17.0.2/umd/react.production.min.js",
    integrity:
      "sha384-7Er69WnAl0+tY5MWEvnQzWHeDFjgHSnlQfDDeWUvv8qlRXtzaF/pNo18Q2aoZNiO",
  },
  "react-dom": {
    crossorigin: true,
    development:
      "https://cdn.jsdelivr.net/npm/react-dom@17.0.2/umd/react-dom.development.js",
    production:
      "https://cdn.jsdelivr.net/npm/react-dom@17.0.2/umd/react-dom.production.min.js",
    integrity:
      "sha384-vj2XpC1SOa8PHrb0YlBqKN7CQzJYO72jz4CkDQ+ePL1pwOV4+dn05rPrbLGUuvCv",
  },
  recording: {
    crossorigin: true,
    development: "https://cdn.jsdelivr.net/npm/rp-recording@2.1.1/dist/rp-recording.js",
  },
};

export const styles: Record<string, StyleData> = {
  liqvid: {
    development: "https://cdn.jsdelivr.net/npm/liqvid@2.1.4/dist/liqvid.css",
    production: "https://cdn.jsdelivr.net/npm/liqvid@2.1.4/dist/liqvid.min.css",
  },
};
