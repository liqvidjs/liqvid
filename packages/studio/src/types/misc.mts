/** biome-ignore-all lint/suspicious/noExplicitAny: variance */
import { Brand } from "effect";

export type RecordSignificantKeyOrder<K extends keyof any, V> = Record<K, V> &
  Brand.Brand<"RecordSignificantKeyOrder">;

export const RecordSignificantKeyOrder =
  Brand.nominal<RecordSignificantKeyOrder<any, any>>();
