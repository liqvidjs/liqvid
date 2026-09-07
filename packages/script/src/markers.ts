import type { Marker } from "./types.mts";

export namespace Markers {
  /** Whether m1 is strictly after m2 */
  export const after = <M extends string>(
    m1: Marker<M>,
    m2: Marker<M>,
  ): boolean => m1.index > m2.index;

  /** Whether m1 is equal to or after m2 */
  export const atLeast = <M extends string>(
    m1: Marker<M>,
    m2: Marker<M>,
  ): boolean => m1.index >= m2.index;

  /** Whether m1 is equal to or before m2 */
  export const atMost = <M extends string>(
    m1: Marker<M>,
    m2: Marker<M>,
  ): boolean => m1.index <= m2.index;

  /** Whether m1 is strictly before m2 */
  export const before = <M extends string>(
    m1: Marker<M>,
    m2: Marker<M>,
  ): boolean => m1.index < m2.index;
}
