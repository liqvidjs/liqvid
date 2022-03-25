# rp-recording

> Recording functionality for [`Liqvid`](https://liqvidjs.org/).

Take a look at [`rp-cursor`](https://github.com/ysulyma/rp-cursor) for how to make a third-party recorder.

## Usage
```tsx
import {Player} from "liqvid";
import {RecordingControl} from "@liqvid/recording";

const controls = (<>
  {Player.defaultControlsLeft}

  <div className="rp-controls-right">
    <RecordingControl plugins={[/* recording plugins */]}/>
    {Player.defaultControlsRight}
  </div>
</>);

/* ... */

<Player controls={controls} script={script}>
  {/* */}
</Player>
```

### Audio

**It is necessary to access the page over HTTPS in order to record audio.**
This is a good guide for setting up SSL for local development: https://medium.freecodecamp.org/how-to-get-https-working-on-your-local-development-environment-in-5-minutes-7af615770eec

This will record audio files, to be used with the Audio element.

### Markers

Press `w` to go back a marker, `e` to advance a marker. When recording, you should probably only advance a slide. You will usually want this on.
