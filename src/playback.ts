import {Playback} from "@liqvid/playback";
import {parseTime} from "@liqvid/utils/time";

// backwards compatibility
Object.defineProperty(Playback.prototype, "hub", {get: function() {return this;}});
const seek = Playback.prototype.seek;
Playback.prototype.seek = function(t: number | string) {
  if (typeof t === "string")
    t = parseTime(t);
  seek.call(this, t);
}

export default Playback;
