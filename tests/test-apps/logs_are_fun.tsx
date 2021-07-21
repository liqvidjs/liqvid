import * as ReactDOM from "react-dom";
import { Player, Script } from "liqvidjs";

const markers = [
  ["intro/title", "0:05"],
  ["intro/fun", "0:05"],
  ["intro/agenda", "0:05"],
  ["ex/", "0:05"],
] as [string, string][];

const script = new Script(markers);
const playback = script.playback;

function Intro(props) {
  const attrs = { style: { color: "red" } };
  return (
    <section {...props} {...attrs}>
      <h1 data-from-first="intro/title" data-from-last="intro/agenda">
        Logarithmsa <span data-from-first="intro/fun">are</span> fun!
      </h1>
      <ul id="intro-props" data-from-first="intro/agenda">
        <li>related to exponents</li>
      </ul>
    </section>
  );
}

function Examples(props) {
  return (
    <section {...props}>
      <h2>Examples</h2>
      <ul id="ex-list">
        <li>compound interest</li>
        <li>decibel scale</li>
        <li>Richter cale</li>
      </ul>
    </section>
  );
}

function Lesson() {
  return (
    <Player script={script}>
      <Intro data-during="intro/" />
      <Examples data-during="ex/" />
    </Player>
  );
}

ReactDOM.render(<Lesson />, document.querySelector("main"));
