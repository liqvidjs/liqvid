import { applyDiff, diffObjects, invertDiff, mergeDiffs } from "../src";

/**
 * Merging the diffs `a→b` and `b→c` should produce the diff `a→c`.
 */
// biome-ignore lint/suspicious/noExplicitAny: test helper accepts arbitrary shapes
function expectMergeComposes(a: any, b: any, c: any) {
  const ab = diffObjects(a, b);
  const bc = diffObjects(b, c);
  const merged = mergeDiffs(ab, bc);
  expect(applyDiff(a, merged)).toEqual(c);
}

describe("mergeDiffs", () => {
  test("change then change", () => {
    expectMergeComposes({ x: 1 }, { x: 2 }, { x: 3 });
  });

  test("create then change", () => {
    expectMergeComposes({}, { x: 1 }, { x: 5 });
  });

  test("create then delete", () => {
    expectMergeComposes({}, { x: 1 }, {});
  });

  test("delete then create becomes set", () => {
    expectMergeComposes({ x: 1 }, {}, { x: 9 });
  });

  test("change then delete", () => {
    expectMergeComposes({ x: 1 }, { x: 2 }, {});
  });

  test("nested object updates compose", () => {
    expectMergeComposes(
      { obj: { a: 1, b: 2 } },
      { obj: { a: 10, b: 2 } },
      { obj: { a: 10, b: 20, c: 30 } },
    );
  });

  test("array appends compose", () => {
    expectMergeComposes(
      { arr: [1, 2] },
      { arr: [1, 2, 3] },
      { arr: [1, 2, 3, 4, 5] },
    );
  });

  test("array append then element change compose", () => {
    expectMergeComposes(
      { arr: [1, 2] },
      { arr: [1, 2, 3] },
      { arr: [1, 9, 3] },
    );
  });

  test("array deletions compose", () => {
    expectMergeComposes(
      { arr: [1, 2, 3, 4] },
      { arr: [1, 2, 3] },
      { arr: [1] },
    );
  });

  test("mixed kitchen sink composes", () => {
    expectMergeComposes(
      { arr: [1, 2, 3], obj: { color: "red" }, x: 1, y: 2 },
      { arr: [1, 2, 3, 4], obj: { color: "blue" }, x: 1 },
      { arr: [1, 2, 3, 4, 5], obj: { color: "blue", shade: "dark" }, z: 9 },
    );
  });
});

describe("invertDiff", () => {
  test("inverting a diff and applying it restores the original", () => {
    const a = { arr: [1, 2, 3], obj: { color: "red" }, x: 1 };
    const b = { arr: [1, 2, 3, 4], obj: { color: "blue" }, y: 2 };

    const diff = diffObjects(a, b);
    const inverse = invertDiff(a, diff);

    expect(applyDiff(b, inverse)).toEqual(a);
  });
});
