import "@tldraw/tldraw/tldraw.css";
import "liqvid/dist/liqvid.min.css";

import * as $diff from "@liqvid/diff";
window.$diff = $diff;

import {Recording} from "./record";
import {Replay} from "./replay";

export default function App() {
  const params = new URLSearchParams(location.search);

  return params.has("record") ? <Recording /> : <Replay />;
}
