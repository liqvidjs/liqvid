# @liqvid/prompt

This is a [Liqvid](https://liqvidjs.org) plugin providing prompts to read from when recording.

## Usage
```tsx
/* markers */
const markers = [
  ["intro/", "1:00"],
  ["intro/second", "1:00"],
  ["intro/inline", "1:00"]
];

/* usage */
import {Prompt, Cue} from "@liqvid/prompt";

// any attributes that are valid on <div> will be passed down
type P = Parameters<typeof Prompt>[0];

export const IntroPrompt = (props: P) => (
  <Prompt {...props}>
    <Cue on="intro/">
      This is the first thing you want to say. You can use
      <br/>
      br tags inside cues.
    </Cue>
    <Cue on="intro/second">
      This is the second thing you want to say. You can also use empty cue tags <Cue on="intro/inline"/> for small transitions without interrupting your reading flow.
    </Cue>
  </Prompt>
);
```
