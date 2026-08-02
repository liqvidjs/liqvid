/** biome-ignore-all lint/suspicious/noExplicitAny: very complicated types here */
import { assertDefined, assertType } from "@liqvid/utils";

import { applyArrayDiff, applyDiff } from "./apply.ts";
import {
  arrayDiff,
  arrayItemDiff,
  changeDiff,
  changeItemDiff,
  creationDiff,
  deletionDiff,
  objectDiff,
  objectItemDiff,
} from "./builders.ts";
import type { ArrayDiff, ItemDiff, ObjectDiff } from "./types.ts";
import {
  addToOffset,
  consume,
  getOffset,
  matchItemDiff,
  matchRunes,
  objectKeys,
} from "./utils.ts";

/** Merge two array diffs. */
export function mergeArrayDiffs<T>(
  a: ArrayDiff<T>,
  b: ArrayDiff<T>,
): ArrayDiff<T> {
  const [deltaA, itemDiffsA = [], ...tailA] = a;
  const [deltaB, itemDiffsB = [], ...tailB] = b;

  const delta = deltaA + deltaB;

  // combine item diffs
  const itemDiffs: ItemDiff<T>[] = [];

  let iterA = 0;
  let iterB = 0;

  for (; iterA < itemDiffsA.length || iterB < itemDiffsB.length; ) {
    const itemA = itemDiffsA.at(iterA);
    const itemB = itemDiffsB.at(iterB);

    const offsetA = itemA ? getOffset(itemA[0]) : 0;
    const offsetB = itemB ? getOffset(itemB[0]) : 0;

    const newOffsetB = offsetB - deltaA;

    if (itemA && (!itemB || offsetA > newOffsetB)) {
      // skip if deleted by b
      if (offsetA > -deltaB) {
        itemDiffs.push(itemA);
      }
      iterA++;
    } else if (itemB && (!itemA || newOffsetB > offsetA)) {
      if (deltaA >= 0) {
        // adjust the tail of A
        if (offsetB <= tailA.length) {
          const tailOffset = tailA.length - offsetB;
          const valueA = tailA[tailOffset];

          matchItemDiff(itemB, {
            // array. Merge into a fresh copy (not in place) so `a`'s tail —
            // which may be shared with the caller's original diff — is not
            // mutated.
            array(_, valueB) {
              assertType<unknown[]>(valueA);
              tailA[tailOffset] = applyArrayDiff(valueA, valueB);
            },
            object(_, valueB) {
              assertType<T[string & keyof T]>(valueA);
              tailA[tailOffset] = applyDiff(valueA, valueB);
            },
            // set
            set(_, valueB) {
              tailA[tailOffset] = valueB;
            },
          });
        } else {
          // preserve itemB's rune (array/object/set) while shifting its offset
          itemDiffs.push([
            addToOffset(itemB[0], -deltaA),
            itemB[1],
          ] as ItemDiff<T>);
        }
      } else {
        // preserve itemB's rune (array/object/set) while shifting its offset
        itemDiffs.push([
          addToOffset(itemB[0], -deltaA),
          itemB[1],
        ] as ItemDiff<T>);
      }

      iterB++;
    } else {
      assertDefined(itemA);
      assertDefined(itemB);
      // offsetA === newOffsetB
      matchItemDiff(itemA, {
        array(_, valueA) {
          matchItemDiff(itemB, {
            // array(a) * array(b) = array(a*b)
            array(_, valueB) {
              itemDiffs.push(
                arrayItemDiff<any>(offsetA, mergeArrayDiffs(valueA, valueB)),
              );
            },
            // array(a) * change(b) = change(b)
            set(_, valueB) {
              itemDiffs.push(changeItemDiff<any>(offsetA, valueB));
            },
          });
        },
        object(_, valueA) {
          matchItemDiff(itemB, {
            // object(a) * object(b) = object(a*b)
            object(_, valueB) {
              itemDiffs.push(
                objectItemDiff(offsetA, mergeDiffs(valueA, valueB)),
              );
            },
            // object(a) * change(b) = change(b)
            set(_, valueB) {
              itemDiffs.push(changeItemDiff<any>(offsetA, valueB));
            },
          });
        },
        set(_, valueA) {
          matchItemDiff(itemB, {
            // change(a) * array(b) = change(a*b)
            array(_, valueB) {
              assertType<unknown[]>(valueA);
              itemDiffs.push(
                changeItemDiff<any>(offsetA, applyArrayDiff(valueA, valueB)),
              );
            },
            // change(a) * object(b) = change(a*b)
            object(_, valueB) {
              assertType<object>(valueA);
              itemDiffs.push(
                changeItemDiff(offsetA, applyDiff<any>(valueA, valueB)),
              );
            },
            // change(a) * change(b) = change(b)
            set(_, valueB) {
              itemDiffs.push(changeItemDiff<any>(offsetA, valueB));
            },
          });
        },
      });

      iterA++;
      iterB++;
    }
  }

  // needs to come afterwards since we modify tailA above
  const tail = [
    ...tailA.slice(0, tailA.length + Math.min(0, deltaB)),
    ...tailB,
  ];

  return [delta, itemDiffs, ...tail];
}

/** Merge two object diffs. */
export function mergeDiffs<T>(
  a: ObjectDiff<T>,
  b: ObjectDiff<T>,
): ObjectDiff<T> {
  const ret: ObjectDiff<T> = {};

  // `consume` deletes keys from `a` as it walks it, so operate on a shallow
  // copy — otherwise merging would destructively empty the caller's diff.
  // Nested structures are handled by the recursive `mergeDiffs` /
  // `mergeArrayDiffs` calls, which each copy their own level; and `applyDiff`
  // clones values on insertion, so the references carried over from `a`/`b`
  // stay immutable once the merged diff is later applied.
  a = { ...a };

  for (const rKeyB of objectKeys(b)) {
    matchRunes(b, rKeyB, {
      // array
      array(key, valueB) {
        consume(a, key, {
          array(valueA) {
            Object.assign(ret, arrayDiff(key, mergeArrayDiffs(valueA, valueB)));
          },
          // set(a) * array(b) = set(a*b)
          change(valueA) {
            assertType<unknown[]>(valueA);
            Object.assign(ret, changeDiff(key, applyArrayDiff(valueA, valueB)));
          },
          // create(a) * array(b) = create(a*b)
          create(valueA) {
            assertType<unknown[]>(valueA);
            Object.assign(
              ret,
              creationDiff(key, applyArrayDiff(valueA, valueB)),
            );
          },
          else(name) {
            throw new Error(`Invalid merge: ${name}-array`);
          },
          none() {
            Object.assign(ret, arrayDiff(key, valueB));
          },
        });
      },
      // set
      change(key, valueB) {
        consume(a, key, {
          // create * set(b) = create(b)
          create() {
            Object.assign(ret, creationDiff(key, valueB));
          },
          // invalid
          delete() {
            throw new Error("Invalid merge: delete-set");
          },
          // _ * set(b) = set(b)
          else() {
            Object.assign(ret, changeDiff(key, valueB));
          },
          none() {
            Object.assign(ret, changeDiff(key, valueB));
          },
        });
      },
      // create
      create(key, valueB) {
        consume(a, key, {
          // delete * create(b) = set(b)
          delete() {
            Object.assign(ret, changeDiff(key, valueB));
          },
          else(name) {
            throw new Error(`Invalid merge: ${name}-add`);
          },
          none() {
            Object.assign(ret, creationDiff(key, valueB));
          },
        });
      },
      // delete
      delete(key) {
        consume(a, key, {
          delete() {
            throw new Error("Invalid merge: delete-delete");
          },
        });
        Object.assign(ret, deletionDiff(key));
      },
      // object
      object(key, valueB) {
        consume(a, key, {
          // set(a) * object(b) = set(a*b)
          change(valueA) {
            assertType<T>(valueA);
            Object.assign(ret, changeDiff(key, applyDiff(valueA, valueB)));
          },
          // create(a) * object(b) = object(a*b)
          create(valueA) {
            assertType<T>(valueA);
            Object.assign(ret, creationDiff(key, applyDiff(valueA, valueB)));
          },
          else(name) {
            throw new Error(`Invalid merge: ${name}-array`);
          },
          none() {
            Object.assign(ret, objectDiff(key, valueB));
          },
          // object(a) * object(b) = object(a*b)
          object(valueA) {
            Object.assign(ret, objectDiff(key, mergeDiffs(valueA, valueB)));
          },
        });
      },
    });
  }

  // add anything remaining from a
  Object.assign(ret, a);

  return ret;
}
