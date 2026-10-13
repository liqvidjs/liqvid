import { Playback } from "../src/index.mts";

it("should stop() when seeked to end", () => {
  const playback = new Playback({ duration: 60_000 });
  const onStop = jest.fn();
  playback.on("stop", onStop);
  playback.seek(playback.duration);
  expect(onStop).toHaveBeenCalledTimes(1);
});
