import { render } from "@testing-library/react";
import { Playback } from "liqvid";
import type { MediaElement } from "../src";
import { PlaybackContext, useME } from "../src/react";

function Test<T>(props: {
  hook: () => T;
  return: {
    value: T;
  };
}): null {
  props.return.value = props.hook();
  return null;
}

describe("useME", () => {
  it("should handle null PlaybackContext", () => {
    const o = { value: undefined as MediaElement | null };

    render(
      <>
        <Test hook={useME} return={o} />
      </>,
    );

    expect(o.value).toBe(null);
  });

  it("should proxy Liqvid", () => {
    const playback = new Playback({ duration: 30000 });
    const o = { value: undefined as MediaElement };

    render(
      <PlaybackContext.Provider value={playback as unknown as MediaElement}>
        <Test hook={useME} return={o} />
      </PlaybackContext.Provider>,
    );

    const proxy = o.value;
    const f = jest.fn();
    proxy.addEventListener("seeking", f);

    expect(proxy.currentTime).toBe(0);
    expect(proxy.duration).toBe(30);

    playback.seek(15000);
    expect(proxy.currentTime).toBe(15);
    expect(f).toHaveBeenCalledTimes(1);

    proxy.removeEventListener("seeking", f);
    proxy.currentTime = 20;
    expect(playback.currentTime).toBe(20000);
    expect(f).toHaveBeenCalledTimes(1);
  });
});
