/** biome-ignore-all lint/suspicious/noExplicitAny: variance */
import { Brand } from "effect";

interface ConstBranded<in out B extends Brand.Brand<string>>
  extends Brand.Constructor<B> {
  <const S extends string>(unbranded: S): B & S;
}

export type RecordSignificantKeyOrder<K extends keyof any, V> = Record<K, V> &
  Brand.Brand<"RecordSignificantKeyOrder">;

export const RecordSignificantKeyOrder =
  Brand.nominal<RecordSignificantKeyOrder<any, any>>();

/** name of an NPM package */
export type PackageName<T extends string = string> = T &
  Brand.Brand<"PackageName">;

export const PackageName = Brand.nominal() as ConstBranded<PackageName>;
