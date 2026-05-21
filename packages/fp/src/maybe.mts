// interface
interface MaybeMethods<T> {
  filter<S extends T>(predicate: (value: T) => value is S): Maybe<S>;
  filter(predicate: (value: T) => boolean): Maybe<T>;
  inspect(f: (value: T) => void): Maybe<T>;
  isSomeAnd(f: (value: T) => boolean): this is Maybe.Some<T>;
  map<S>(f: (value: T) => S): Maybe<S>;
  or<S>(optb: Maybe<S>): Maybe<S | T>;
  unwrapOr<S>(altValue: S): S | T;
  unwrapOrElse<S>(getAltValue: () => S): S | T;

  json(): SerializedMaybe<T>;
}

export namespace Maybe {
  export type Some<T> = MaybeMethods<T> & {
    isNone: false;
    isSome: true;
    unwrap(): T;
  };

  export type None = MaybeMethods<never> & {
    isNone: true;
    isSome: false;
  };
}

// type MaybeMaybeMethods<T> =
//   T extends MaybeMethods<infer V> ? { flatten: () => Maybe<V> } : unknown;

export type Maybe<T> = Maybe.Some<T> | Maybe.None;

// implementation
class internalMaybe<T> implements MaybeMethods<T> {
  public isSome: boolean;
  private value: T | undefined;

  constructor(isSome: boolean, value?: T) {
    this.isSome = isSome;
    this.value = value;
  }

  get isNone() {
    return !this.isSome;
  }

  filter(predicate: (value: T) => boolean): Maybe<T> {
    if (this.isSome && predicate(this.value as T)) {
      return this as Maybe<T>;
    }

    return None as Maybe<T>;
  }

  inspect(f: (value: T) => void): Maybe<T> {
    if (this.isSome) {
      f(this.value as T);
    }

    return this as Maybe<T>;
  }

  isSomeAnd(f: (value: T) => boolean): this is Maybe.Some<T> {
    return this.isSome && f(this.value as T);
  }

  map<S>(f: (value: T) => S): Maybe<S> {
    if (this.isSome) {
      return Some(f(this.value as T));
    }
    return None as Maybe<S>;
  }

  or<S>(optb: Maybe<S>): Maybe<S | T> {
    if (this.isSome) {
      return this as Maybe<S | T>;
    }

    return optb as Maybe<S | T>;
  }

  unwrap() {
    if (this.isSome) {
      return this.value as T;
    }
    throw new Error("Tried to unwrap None");
  }

  unwrapOr<S>(altValue: S) {
    if (this.isSome) {
      return this.value as T;
    }
    return altValue;
  }

  unwrapOrElse<S>(getAltValue: () => S) {
    if (this.isSome) {
      return this.value as T;
    }
    return getAltValue();
  }

  json(): SerializedMaybe<T> {
    if (this.isSome) {
      return { "#some": this.value as T };
    }
    return null;
  }

  flatten() {
    if (this.isNone) return None;
    if (!isMaybe(this.value)) {
      throw new Error("Called flatten() on non-Maybe<Maybe<_>>");
    }

    if (this.value.isNone) return None;
    return this.value;
  }
}

function isMaybe<T>(obj: unknown): obj is Maybe<T> {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "isSome" in obj &&
    typeof obj.isSome === "boolean"
  );
}

export function Some<T>(value: T): Maybe<T> {
  const obj = new internalMaybe(true, value);
  Object.freeze(obj);
  return obj as unknown as Maybe<T>;
}

// biome-ignore lint/suspicious/noExplicitAny: variance
export const None = new internalMaybe(false) as unknown as Maybe<any>;
Object.freeze(None);

export type SerializedMaybe<T> = {
  "#some": T;
} | null;

export namespace Maybe {
  /** Deserialize into a Maybe */
  export function parse<T>(obj: SerializedMaybe<T>): Maybe<T> {
    if (obj === null) {
      return None as Maybe<T>;
    }
    return Some(obj["#some"]);
  }

  /** Compare two Maybe values */
  export function eq<T>(
    $a: Maybe<T>,
    $b: Maybe<T>,
    eq: (a: T, b: T) => boolean = (a, b) => a === b,
  ): boolean {
    if ($a.isNone && $b.isNone) return true;
    if ($a.isSome && $b.isSome) return eq($a.unwrap(), $b.unwrap());
    return false;
  }

  /** Return `None` if `value` is falsy, otherwise `Some(value)` */
  export function falsy<T>(
    value: T | "" | 0 | false | null | undefined,
  ): Maybe<T> {
    if (!value) return None as Maybe<T>;
    return Some(value);
  }

  /** Returh `None` if `value` is nullish, otherwise `Some(value)` */
  export function nullish<T>(value: T | null | undefined): Maybe<T> {
    if (value === null || value === undefined) return None as Maybe<T>;
    return Some(value);
  }
}
