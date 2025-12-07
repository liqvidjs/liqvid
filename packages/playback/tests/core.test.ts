import { Playback } from "../src/index";

it("should stop() when seeked to end", () => {
  const playback = new Playback({ duration: 60000 });
  const onStop = jest.fn();
  playback.on("stop", onStop);
  playback.seek(playback.duration);
  expect(onStop).toHaveBeenCalledTimes(1);
});
