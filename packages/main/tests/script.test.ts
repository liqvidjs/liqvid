import "./matchMedia.mock";
import "./DocumentTimeline.mock";

import {Playback, Player, Script} from "..";

describe("Script", () => {
  let script: Script;

  beforeEach(() => {
    script = new Script([
      ["A", "20"],
      ["B", "20"],
      ["C", "20"]
    ]);
  });

  test("constructor", () => {
    expect(script.markers).toEqual([["A", 0, 20000], ["B", 20000, 40000], ["C", 40000, 60000]]);
    expect(script.markerIndex).toBe(0);
    expect(script.markerName).toBe("A");

    expect(script.playback).toBeInstanceOf(Playback);
    expect(script.playback.duration).toBe(60000);
  });

  test("back/forward", () => {
    script.forward();
    expect(script.markerName).toBe("B");
    expect(script.playback.currentTime).toBe(20000);

    script.forward();
    expect(script.markerName).toBe("C");
    expect(script.playback.currentTime).toBe(40000);

    script.forward();
    expect(script.markerName).toBe("C");
    expect(script.playback.currentTime).toBe(40000);

    script.back();
    expect(script.markerName).toBe("B");
    expect(script.playback.currentTime).toBe(20000);

    script.back();
    expect(script.markerName).toBe("A");
    expect(script.playback.currentTime).toBe(0);

    script.back();
    expect(script.markerName).toBe("A");
    expect(script.playback.currentTime).toBe(0);
  });

  test("markerByName", () => {
    expect(script.markerByName("B")).toEqual(["B", 20000, 40000]);
    expect(() => script.markerByName("D")).toThrow("Marker D does not exist");
  });

  test("markerNumberOf", () => {
    expect(script.markerNumberOf("B")).toBe(1);
    expect(() => script.markerNumberOf("D")).toThrow("Marker D does not exist");
  });

  test("parseStart", () => {
    expect(script.parseStart("B")).toBe(20000);
    expect(script.parseStart("20.5")).toBe(20500);
  });

  test("parseEnd", () => {
    expect(script.parseEnd("B")).toBe(40000);
    expect(script.parseEnd("20.5")).toBe(20500);
  });

  test("responds to playback", () => {
    script.playback.seek(30000);
    expect(script.markerIndex).toBe(1);
    expect(script.markerName).toBe("B");
  });
});
