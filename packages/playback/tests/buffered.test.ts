import {
  type BufferedItem,
  Playback,
  type ReadyStateItem,
} from "../src/index.mts";

test("readyState preserves every HTMLMediaElement readiness value", () => {
  const playback = new Playback();
  const item: ReadyStateItem = { readyState: 0 };
  playback.registerReadyStateItem(item);

  for (const readyState of [0, 1, 2, 3, 4]) {
    playback.updateReadyStateItem(item, readyState);
    expect(playback.readyState).toBe(readyState);
  }
});

describe("Playback.buffered", () => {
  test("returns ranges shared by every registered media source", () => {
    const playback = new Playback();
    const first: BufferedItem = {
      buffered: [
        [0, 5],
        [10, 15],
      ],
    };
    const second: BufferedItem = { buffered: [[2, 12]] };

    playback.registerBufferedItem(first);
    playback.registerBufferedItem(second);

    expect(playback.buffered.length).toBe(2);
    expect(playback.buffered.start(0)).toBe(2);
    expect(playback.buffered.end(0)).toBe(5);
    expect(playback.buffered.start(1)).toBe(10);
    expect(playback.buffered.end(1)).toBe(12);
  });

  test("emits bufferupdate when the aggregate ranges change", () => {
    const playback = new Playback();
    const item: BufferedItem = { buffered: [] };
    const onBufferUpdate = jest.fn();
    playback.addEventListener("bufferupdate", onBufferUpdate);

    playback.registerBufferedItem(item);
    playback.updateBufferedItem(item, [[0, 10]]);
    playback.updateBufferedItem(item, [[0, 10]]);

    expect(onBufferUpdate).toHaveBeenCalledTimes(1);
  });
});
