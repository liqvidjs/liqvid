/** biome-ignore-all lint/suspicious/noExplicitAny: don't need exact types */
import { applyDiff, diffObjects } from "../src/index.ts";

describe("diffObjects and applyDiff", () => {
  test("property deletion", () => {
    const a = { x: 1 };
    const b = {};

    const diff = diffObjects(a, b);

    expect(diff).toEqual({ "-x": 0 });
    expect(applyDiff(a, diff)).toEqual(b);
  });

  test("property additions", () => {
    const a = {};
    const b = { x: 1 };

    const diff = diffObjects(a, b);

    expect(diff).toEqual({ "+x": 1 });
    expect(applyDiff(a, diff)).toEqual(b);
  });

  test("property changes", () => {
    const a = { x: 1 };
    const b = { x: 2 };

    const diff = diffObjects(a, b);

    expect(diff).toEqual({ "=x": 2 });
    expect(applyDiff(a, diff)).toEqual(b);
  });

  test("array appends", () => {
    const a = { x: [0, 1, 2] };
    const b = { x: [0, 1, 2, 3, 4] };

    const diff = diffObjects(a, b);

    expect(diff).toEqual({ "#x": [2, [], 3, 4] });
    expect(applyDiff(a, diff)).toEqual(b);
  });

  test("array deletions", () => {
    const a = { x: [0, 1, 2] };
    const b = { x: [0] };

    const diff = diffObjects(a, b);

    expect(diff).toEqual({ "#x": [-2] });
    expect(applyDiff(a, diff)).toEqual(b);
  });

  test("array changes", () => {
    const a = { x: [0, 1, 2] };
    const b = { x: [0, 3] };

    const diff = diffObjects(a, b);

    expect(diff).toEqual({ "#x": [-1, [[2, 3]]] });
    expect(applyDiff(a, diff)).toEqual(b);
  });

  test("nested objects", () => {
    const a = { x: { color: "red", fruit: "apple" } };
    const b = { x: { fruit: "potato", kind: "mashed" } };

    const diff = diffObjects<any>(a, b);

    expect(diff).toEqual({
      "@x": { "-color": 0, "+kind": "mashed", "=fruit": "potato" },
    });
    expect(applyDiff(a, diff)).toEqual(b);
  });

  test("objects nested in arrays", () => {
    const a = {
      shapes: {
        square: {
          segments: [{ points: [0, 1], type: "free" }],
        },
      },
    };
    const b = {
      shapes: {
        square: {
          segments: [{ points: [0, 1, 2, 3], type: "free" }],
        },
      },
    };

    const diff = diffObjects(a, b);
    expect(diff).toEqual({
      "@shapes": {
        "@square": {
          "#segments": [
            0,
            [
              [
                "@1",
                {
                  "#points": [2, [], 2, 3],
                },
              ],
            ],
          ],
        },
      },
    });
    expect(applyDiff(a, diff)).toEqual(b);
  });

  test("kitchen sink", () => {
    const a = {
      arr: [1, 2, 3],
      obj: { color: "red", fruit: "apple" },
      x: 1,
      y: 2,
      z: 3,
    };
    const b = {
      arr: [1, 5, 4, "x", "y"],
      obj: { fruit: "potato", kind: "mashed" },
      w: 4,
      x: 3,
      z: 3,
    };

    const diff = diffObjects<any>(a, b);

    expect(diff).toEqual({
      "-y": 0,
      "@obj": {
        "-color": 0,
        "+kind": "mashed",
        "=fruit": "potato",
      },
      "#arr": [
        2,
        [
          [2, 5],
          [1, 4],
        ],
        "x",
        "y",
      ],
      "+w": 4,
      "=x": 3,
    });
    expect(applyDiff(a, diff)).toEqual(b);
  });

  describe("in-place application does not alias the diff", () => {
    test("create then in-place array append leaves the create diff intact", () => {
      const store: Record<string, unknown> = {};

      // creation diff whose value is a nested object with an array
      const createDiff = { "+shape": { path: [{ x: 0 }] } };

      // apply create in place: store["shape"] must NOT be the same object as
      // the diff's value, otherwise later mutations corrupt the diff
      applyDiff(store, createDiff, true);

      // append to store["shape"].path in place
      applyDiff(store, { "@shape": { "#path": [1, [], { x: 1 }] } }, true);

      // store received the appended point...
      expect((store.shape as { path: unknown[] }).path).toEqual([
        { x: 0 },
        { x: 1 },
      ]);

      // ...but the original create diff is untouched
      expect(createDiff).toEqual({ "+shape": { path: [{ x: 0 }] } });
    });

    test("array append value is cloned, not aliased", () => {
      const arr: Record<string, unknown>[] = [];
      const appended = { n: 0 };

      applyDiff({ arr }, { "#arr": [1, [], appended] }, true);

      // mutating the target must not mutate the source diff value
      (arr[0] as { n: number }).n = 99;
      expect(appended).toEqual({ n: 0 });
    });

    test("set value is cloned, not aliased", () => {
      const arr = [{ n: 1 }];
      const replacement = { n: 2 };

      applyDiff({ arr }, { "#arr": [0, [[0, replacement]]] }, true);

      (arr[0] as { n: number }).n = 99;
      expect(replacement).toEqual({ n: 2 });
    });
  });
});
