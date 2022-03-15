import type {ScriptData, StyleData} from "./types";

export const scripts: Record<string, ScriptData> = {
  "host": "https://unpkg.com/@liqvid/host/lv-host.js",
  "liqvid": {
    "crossorigin": true,
    "development": "https://unpkg.com/liqvid@2.1.3/dist/liqvid.js",
    "production": "https://unpkg.com/liqvid@2.1.3/dist/liqvid.min.js",
    "integrity": "sha384-PF1Q6/ZHWULtuwe8ef5LK49usEuK4uCYtOM8l+u4Wu0hpZw5r0WDgDe9slKjNIwj"
  },
  "livereload": {},
  "polyfills": "https://unpkg.com/@liqvid/polyfills/dist/waapi.js",
  "rangetouch": {
    "crossorigin": true,
    "development": "https://cdn.rangetouch.com/2.0.1/rangetouch.js",
    "integrity": "sha384-ImWMbbJ1rSn1mn+2vsKm/wN6Vc7hPNB2VKN0lX3FAzGK+c7M2mD6ZZcwknuKlP7K",
    "production": "https://cdn.rangetouch.com/2.0.1/rangetouch.js"
  },
  "react": {
    "crossorigin": true,
    "development": "https://cdnjs.cloudflare.com/ajax/libs/react/17.0.1/umd/react.development.js",
    "integrity": "sha384-YF0qbrX3+TW1Oyow2MYZpkEMq34QcYzbTJbSb9K0sdeykm4i4kTCSrsYeH8HX11w",
    "production": "https://cdnjs.cloudflare.com/ajax/libs/react/17.0.1/umd/react.production.min.js"
  },
  "react-dom": {
    "crossorigin": true,
    "development": "https://cdnjs.cloudflare.com/ajax/libs/react-dom/17.0.1/umd/react-dom.development.js",
    "production": "https://cdnjs.cloudflare.com/ajax/libs/react-dom/17.0.1/umd/react-dom.production.min.js",
    "integrity": "sha384-DHlzXk2aXirrhqAkoaI5lzdgwWB07jUHz7DJGmS4Vlvt5U/ztRy+Yr8oSgQw5QaE"
  },
  "recording": {
    "crossorigin": true,
    "development": "https://unpkg.com/rp-recording@2.1.1/dist/rp-recording.js"
  }
};

export const styles: Record<string, StyleData> = {
  "liqvid": {
    "development": "https://unpkg.com/liqvid@2.1.3/dist/liqvid.css",
    "production": "https://unpkg.com/liqvid@2.1.3/dist/liqvid.min.css"
  }
};
