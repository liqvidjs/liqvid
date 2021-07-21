import * as ReactDOM from "react-dom";
import { Player, Script } from "liqvidjs";
import "../utils";

const markers = [
  ["one", "0:01"],
  ["two", "0:01"],
] as [string, string][];

const script = new Script(markers);

function Lesson() {
  return (
    <Player script={script}>
      <div data-during="one">a</div>
      <div data-during="two">b</div>
    </Player>
  );
}

ReactDOM.render(<Lesson />, document.querySelector("main"));

let globals = self as any;
globals.playback = script.playback;
globals.script = script;
