import {assertDefined, assertType} from "@liqvid/utils/types";
import {applyArrayDiff, applyDiff} from "./apply";
import {
  arrayDiff,
  arrayItemDiff,
  changeDiff,
  changeItemDiff,
  creationDiff,
  deletionDiff,
  objectDiff,
  objectItemDiff,
} from "./builders";
import type {ArrayDiff, ItemDiff, ObjectDiff} from "./types";
import {
  consume,
  getOffset,
  matchItemDiff,
  matchRunes,
  objectKeys,
} from "./utils";

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

    if (offsetA > newOffsetB) {
      assertDefined(itemA);
      // skip if deleted by b
      if (offsetA > -deltaB) {
        itemDiffs.push(itemA);
      }
      iterA++;
    } else if (newOffsetB > offsetA) {
      assertDefined(itemB);
      if (deltaA >= 0) {
        // adjust the tail of A
        if (offsetB <= tailA.length) {
          const tailOffset = tailA.length - offsetB;
          const valueA = tailA[tailOffset];

          matchItemDiff(itemB, {
            // set
            set(_, valueB) {
              tailA[tailOffset] = valueB;
            },
            // array
            array(_, valueB) {
              assertType<unknown[]>(valueA);
              tailA[tailOffset] = applyArrayDiff(valueA, valueB);
            },
            object(_, valueB) {
              assertType<Record<string, unknown>>(valueA);
              tailA[tailOffset] = applyDiff(valueA, valueB);
            },
          });
        } else {
          itemDiffs.push([newOffsetB, itemB[1]] as ItemDiff<T>);
        }
      } else {
        itemDiffs.push([newOffsetB, itemB[1]] as ItemDiff<T>);
      }

      iterB++;
    } else {
      assertDefined(itemA);
      assertDefined(itemB);
      // offsetA === newOffsetB
      matchItemDiff(itemA, {
        set(_, valueA) {
          matchItemDiff(itemB, {
            // change(a) * change(b) = change(b)
            set(_, valueB) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              itemDiffs.push(changeItemDiff<any>(offsetA, valueB));
            },
            // change(a) * array(b) = change(a*b)
            array(_, valueB) {
              assertType<unknown[]>(valueA);
              itemDiffs.push(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                changeItemDiff<any>(offsetA, applyArrayDiff(valueA, valueB)),
              );
            },
            // change(a) * object(b) = change(a*b)
            object(_, valueB) {
              assertType<object>(valueA);
              itemDiffs.push(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                changeItemDiff<any>(offsetA, applyDiff(valueA, valueB)),
              );
            },
          });
        },
        array(_, valueA) {
          matchItemDiff(itemB, {
            // array(a) * change(b) = change(b)
            set(_, valueB) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              itemDiffs.push(changeItemDiff<any>(offsetA, valueB));
            },
            // array(a) * array(b) = array(a*b)
            array(_, valueB) {
              itemDiffs.push(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                arrayItemDiff<any>(offsetA, mergeArrayDiffs(valueA, valueB)),
              );
            },
          });
        },
        object(_, valueA) {
          matchItemDiff(itemB, {
            // object(a) * change(b) = change(b)
            set(_, valueB) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              itemDiffs.push(changeItemDiff<any>(offsetA, valueB));
            },
            // object(a) * object(b) = object(a*b)
            object(_, valueB) {
              itemDiffs.push(
                objectItemDiff(offsetA, mergeDiffs(valueA, valueB)),
              );
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

  for (const rKeyB of objectKeys(b)) {
    matchRunes(b, rKeyB, {
      // create
      create(key, valueB) {
        consume(a, key, {
          // delete * create(b) = set(b)
          delete() {
            Object.assign(ret, changeDiff(key, valueB));
          },
          none() {
            Object.assign(ret, creationDiff(key, valueB));
          },
          else(name) {
            throw new Error(`Invalid merge: ${name}-add`);
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
      // array
      array(key, valueB) {
        consume(a, key, {
          // create(a) * array(b) = create(a*b)
          create(valueA) {
            assertType<unknown[]>(valueA);
            Object.assign(
              ret,
              creationDiff(key, applyArrayDiff(valueA, valueB)),
            );
          },
          // set(a) * array(b) = set(a*b)
          change(valueA) {
            assertType<unknown[]>(valueA);
            Object.assign(ret, changeDiff(key, applyArrayDiff(valueA, valueB)));
          },
          else(name) {
            throw new Error(`Invalid merge: ${name}-array`);
          },
          array(valueA) {
            Object.assign(ret, arrayDiff(key, mergeArrayDiffs(valueA, valueB)));
          },
          none() {
            Object.assign(ret, arrayDiff(key, valueB));
          },
        });
      },
      // object
      object(key, valueB) {
        consume(a, key, {
          // create(a) * object(b) = object(a*b)
          create(valueA) {
            assertType<object>(valueA);
            Object.assign(ret, creationDiff(key, applyDiff(valueA, valueB)));
          },
          // set(a) * object(b) = set(a*b)
          change(valueA) {
            assertType<object>(valueA);
            Object.assign(ret, changeDiff(key, applyDiff(valueA, valueB)));
          },
          else(name) {
            throw new Error(`Invalid merge: ${name}-array`);
          },
          // object(a) * object(b) = object(a*b)
          object(valueA) {
            Object.assign(ret, objectDiff(key, mergeDiffs(valueA, valueB)));
          },
          none() {
            Object.assign(ret, objectDiff(key, valueB));
          },
        });
      },
    });
  }

  // add anything remaining from a
  Object.assign(ret, a);

  return ret;
}
