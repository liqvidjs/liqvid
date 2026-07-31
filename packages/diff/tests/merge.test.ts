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

  describe("array-of-objects with misaligned item offsets", () => {
    test("append then change to an existing element composes", () => {
      expectMergeComposes(
        { arr: [{ a: 1 }, { a: 2 }, { a: 3 }] },
        { arr: [{ a: 1 }, { a: 20 }, { a: 3 }, { a: 4 }] },
        { arr: [{ a: 1 }, { a: 20 }, { a: 30 }, { a: 4 }] },
      );
    });

    test("deletion then change composes", () => {
      expectMergeComposes(
        { arr: [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }] },
        { arr: [{ a: 1 }, { a: 20 }] },
        { arr: [{ a: 10 }, { a: 20 }] },
      );
    });

    // Regression: appending an element then changing that newly-appended
    // element used to crash mergeArrayDiffs (offset of B aligned to a
    // non-existent item diff of A).
    test("append then nested change on the appended element composes", () => {
      expectMergeComposes(
        { arr: [{ a: 1 }] },
        { arr: [{ a: 1 }, { a: 2 }] },
        { arr: [{ a: 1 }, { a: 20 }] },
      );
    });

    test("nested object changes at differing offsets compose", () => {
      expectMergeComposes(
        { arr: [{ a: 1 }, { a: 2 }, { a: 3 }] },
        { arr: [{ a: 11 }, { a: 2 }, { a: 3 }] },
        { arr: [{ a: 11 }, { a: 2 }, { a: 33 }] },
      );
    });
  });
});

/**
 * Inverting the diff `a→b` (with respect to `a`) should produce a diff that,
 * when applied to `b`, restores `a`.
 */
// biome-ignore lint/suspicious/noExplicitAny: test helper accepts arbitrary shapes
function expectInverts(a: any, b: any) {
  const diff = diffObjects(a, b);
  const inverse = invertDiff(a, diff);
  const applied = applyDiff(b, inverse);
  expect(applied).toEqual(a);
  // the forward object must be untouched (inversion should not mutate state)
  expect(diffObjects(applied, a)).toEqual({});
}

describe("invertDiff", () => {
  test("inverting a diff and applying it restores the original", () => {
    const a = { arr: [1, 2, 3], obj: { color: "red" }, x: 1 };
    const b = { arr: [1, 2, 3, 4], obj: { color: "blue" }, y: 2 };

    const diff = diffObjects(a, b);
    const inverse = invertDiff(a, diff);

    expect(applyDiff(b, inverse)).toEqual(a);
  });

  test("empty diff inverts to empty", () => {
    const a = { x: 1, y: 2 };
    const diff = diffObjects(a, a);
    expect(diff).toEqual({});
    expect(invertDiff(a, diff)).toEqual({});
  });

  describe("object keys", () => {
    test("created key inverts to deletion", () => {
      expectInverts({}, { x: 1 });
    });

    test("deleted key inverts to creation", () => {
      expectInverts({ x: 1 }, {});
    });

    test("primitive change inverts to old value", () => {
      expectInverts({ x: 1 }, { x: 2 });
    });

    test("string change inverts", () => {
      expectInverts({ s: "hello" }, { s: "world" });
    });

    test("boolean change inverts", () => {
      expectInverts({ flag: true }, { flag: false });
    });

    test("create, delete, and change together", () => {
      expectInverts(
        { change: 2, keep: 0, remove: 1 },
        { add: 3, change: 20, keep: 0 },
      );
    });
  });

  describe("nested objects", () => {
    test("nested value change inverts", () => {
      expectInverts({ obj: { a: 1, b: 2 } }, { obj: { a: 10, b: 2 } });
    });

    test("nested create and delete invert", () => {
      expectInverts({ obj: { a: 1, b: 2 } }, { obj: { a: 1, c: 3 } });
    });

    test("deeply nested change inverts", () => {
      expectInverts(
        { a: { b: { c: { d: 1 } } } },
        { a: { b: { c: { d: 2 } } } },
      );
    });

    test("object added at top level inverts", () => {
      expectInverts({}, { obj: { a: 1, b: 2 } });
    });

    test("object removed at top level inverts", () => {
      expectInverts({ obj: { a: 1, b: 2 } }, {});
    });
  });

  describe("arrays", () => {
    test("append inverts to deletion", () => {
      expectInverts({ arr: [1, 2] }, { arr: [1, 2, 3, 4] });
    });

    test("deletion inverts to append", () => {
      expectInverts({ arr: [1, 2, 3, 4] }, { arr: [1, 2] });
    });

    test("element change inverts", () => {
      expectInverts({ arr: [1, 2, 3] }, { arr: [1, 9, 3] });
    });

    test("multiple element changes invert", () => {
      expectInverts({ arr: [1, 2, 3, 4] }, { arr: [9, 2, 8, 4] });
    });

    test("change plus append inverts", () => {
      expectInverts({ arr: [1, 2, 3] }, { arr: [1, 9, 3, 4, 5] });
    });

    test("change plus deletion inverts", () => {
      expectInverts({ arr: [1, 2, 3, 4, 5] }, { arr: [1, 9, 3] });
    });

    test("first element change with deletion inverts", () => {
      expectInverts({ arr: [1, 2, 3, 4] }, { arr: [9, 2] });
    });

    test("entire array replaced element-wise then extended", () => {
      expectInverts({ arr: [1, 2] }, { arr: [3, 4, 5, 6] });
    });

    test("nested array-of-objects change inverts", () => {
      expectInverts(
        { arr: [{ a: 1 }, { a: 2 }] },
        { arr: [{ a: 1 }, { a: 99 }] },
      );
    });

    test("nested array-of-objects change plus append inverts", () => {
      expectInverts(
        { arr: [{ a: 1 }, { a: 2 }] },
        { arr: [{ a: 1 }, { a: 99 }, { a: 3 }] },
      );
    });

    test("nested array-of-objects change plus deletion inverts", () => {
      expectInverts(
        { arr: [{ a: 1 }, { a: 2 }, { a: 3 }] },
        { arr: [{ a: 1 }, { a: 99 }] },
      );
    });

    test("array of arrays inner change inverts", () => {
      expectInverts(
        {
          grid: [
            [1, 2],
            [3, 4],
          ],
        },
        {
          grid: [
            [1, 2],
            [3, 99],
          ],
        },
      );
    });

    test("array of arrays inner append and deletion invert", () => {
      expectInverts(
        {
          grid: [
            [1, 2],
            [3, 4],
          ],
        },
        { grid: [[1, 2, 5], [3]] },
      );
    });
  });

  test("kitchen sink inverts", () => {
    expectInverts(
      {
        arr: [1, 2, 3],
        gone: "bye",
        obj: { color: "red", nested: { deep: [1, 2] } },
        x: 1,
        y: 2,
      },
      {
        arr: [1, 9, 3, 4, 5],
        obj: { added: true, color: "blue", nested: { deep: [1, 2, 3] } },
        x: 1,
        z: 9,
      },
    );
  });

  test("inverting the inverse restores the forward diff behavior", () => {
    const a = { arr: [1, 2, 3], obj: { c: "red" }, x: 1 };
    const b = { arr: [1, 2, 9, 4], obj: { c: "blue" }, y: 2 };

    const forward = diffObjects(a, b);
    const inverse = invertDiff(a, forward);
    // inverting the inverse (with respect to b) should get us back to `forward`
    const doubleInverse = invertDiff(b, inverse);
    expect(applyDiff(a, doubleInverse)).toEqual(b);
  });

  describe("does not mutate its inputs", () => {
    test("merging a create diff with an array append leaves the create intact", () => {
      // mirrors the tldraw scrub case: a shape `create` followed by appends
      // being merged into a single action while scrubbing across a frame
      const createDiff = { "+shape": { path: [{ n: 0 }] } };
      const appendDiff = { "@shape": { "#path": [1, [], { n: 1 }] } };

      const merged = mergeDiffs(createDiff, appendDiff);

      // the merged create carries both points...
      expect(merged).toEqual({ "+shape": { path: [{ n: 0 }, { n: 1 }] } });
      // ...but the original operands are untouched, so replaying them again
      // (or re-merging on a later scrub) still starts from a single point
      expect(createDiff).toEqual({ "+shape": { path: [{ n: 0 }] } });
      expect(appendDiff).toEqual({ "@shape": { "#path": [1, [], { n: 1 }] } });
    });

    test("chained merges do not accumulate into the first operand", () => {
      const create = { "+arr": [0] };
      const a1 = { "#arr": [1, [], 1] };
      const a2 = { "#arr": [1, [], 2] };

      const merged = mergeDiffs(mergeDiffs(create, a1), a2);

      expect(merged).toEqual({ "+arr": [0, 1, 2] });
      // first operand must be pristine for backward/forward re-scrubbing
      expect(create).toEqual({ "+arr": [0] });
    });
  });
});
