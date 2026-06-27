import type { SerializedValue } from "@liqvid/ssr";

import { type Maybe, None, Some } from "./maybe.mts";

type PromiseValue<A> = A extends Promise<infer T> ? T : A;

type ResultMethods<Val, Err> = {
  flatMap<Val2, Err2>(
    f: (value: Val) => Result<Val2, Err2>,
  ): Result<Val2, Err | Err2>;
  map<Val2>(f: (value: Val) => Val2): Result<Val2, Err>;
  mapErr<Err2>(f: (error: Err) => Err2): Result<Val, Err2>;
  match<Val2, Err2>(arms: {
    Ok: (value: Val) => Val2;
    Err: (error: Err) => Err2;
  }): Val2 | Err2;

  ok(): Maybe<Val>;

  unwrapOr<A>(altValue: A): A | Val;
  unwrapOrElse<A>(altGetter: (err: Err) => A): A | Val;
  unwrapOrThrow(): Val;

  /** @deprecated */
  json(): SerializedResult<Val, Err>;
  toJSON(): SerializedResult<Val, Err>;
};

type ResultResultMethods<T, F> =
  T extends ResultMethods<infer V, infer E>
    ? { flatten: () => Result<V, E | F> }
    : unknown;

const serializationKey = "@liqvid/fp/result";

export type Result<T, E> = ResultMethods<T, E> &
  ResultResultMethods<T, E> &
  (
    | {
        isOk: false;
        isErr: true;
        unwrapErr(): E;
      }
    | {
        isOk: true;
        isErr: false;
        unwrap(): T;
      }
  );

// implementation
class internalResult<Val, Err> {
  private isOk: boolean;
  private value: Val | undefined;
  private error: Err | undefined;

  constructor(isOk: boolean, value: Val | undefined, error: Err | undefined) {
    this.isOk = isOk;
    if (isOk) {
      this.value = value;
    } else {
      this.error = error;
    }
  }

  get isErr() {
    return !this.isOk;
  }

  flatten() {
    if (this.isErr) return this;
    if (!isResult(this.value)) {
      throw new Error("Called flatten() on non-Result<Result<_>>");
    }

    return this.value;
  }

  flatMap<Val2, Err2>(
    f: (value: Val) => Result<Val2, Err2>,
  ): Result<Val2, Err | Err2> {
    if (this.isOk) {
      return f(this.value as Val);
    }
    return this as Result<Val2, Err | Err2>;
  }

  map<S>(f: (value: Val) => S): Result<S, Err> {
    if (this.isOk) {
      return Ok(f(this.value as Val));
    }
    return this as Result<S, Err>;
  }

  mapErr<F>(f: (error: Err) => F): Result<Val, F> {
    if (this.isErr) {
      return Err(f(this.error as Err));
    }
    return this as Result<Val, F>;
  }

  match<T2, E2>(arms: {
    Ok: (value: Val) => T2;
    Err: (error: Err) => E2;
  }): T2 | E2 {
    if (this.isOk) {
      return arms.Ok(this.value as Val);
    } else {
      return arms.Err(this.error as Err);
    }
  }

  ok(): Maybe<Val> {
    if (this.isOk) {
      return Some(this.value as Val);
    }
    return None;
  }

  unwrap() {
    if (this.isOk) {
      return this.value as Val;
    }
    throw new Error("Tried to unwrap Err");
  }

  unwrapErr() {
    if (this.isErr) {
      return this.error as Err;
    }
    throw new Error("Tried to unwrapErr Ok");
  }

  unwrapOr<A>(altValue: A) {
    if (this.isOk) {
      return this.value as Val;
    }
    return altValue;
  }

  unwrapOrElse<A>(altGetter: (err: Err) => A) {
    if (this.isOk) {
      return this.value as Val;
    }
    return altGetter(this.error as Err);
  }

  unwrapOrThrow() {
    if (this.isOk) {
      return this.value as Val;
    }
    throw this.error;
  }

  json(): SerializedResult<Val, Err> {
    return this.toJSON();
  }

  toJSON(): SerializedResult<Val, Err> {
    if (this.isOk) {
      return { __deser: serializationKey, "#ok": this.value as Val };
    }
    return { __deser: serializationKey, "#err": this.error as Err };
  }
}

/** Internal helper for checking if an object is a Result */
function isResult<T, E>(obj: unknown): obj is Result<T, E> {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "isOk" in obj &&
    typeof obj.isOk === "boolean"
  );
}

// biome-ignore lint/suspicious/noExplicitAny: variance
export function Ok<T>(value: T): Result<T, any> {
  const obj = new internalResult(true, value, undefined);
  Object.freeze(obj);
  return obj as unknown as Result<T, never>;
}

// biome-ignore lint/suspicious/noExplicitAny: variance
export function Err<E>(error: E): Result<any, E> {
  const obj = new internalResult(false, undefined, error);
  Object.freeze(obj);
  return obj as unknown as Result<never, E>;
}

export namespace Result {
  /** Convert an array of Results to a single Result */
  export function all<T, E>(results: Result<T, E>[]): Result<T[], E[]> {
    const errors: E[] = [];
    const values: T[] = [];

    for (const result of results) {
      if (result.isErr) {
        errors.push(result.unwrapErr());
      } else {
        values.push(result.unwrap());
      }
    }

    if (errors.length === 0) {
      return Ok(values);
    }

    return Err(errors);
  }

  /** Deserialize a Result. */
  export const parse = <T, E>(ser: SerializedResult<T, E>): Result<T, E> => {
    if ("#ok" in ser) {
      return Ok(ser["#ok"]);
    }
    return Err(ser["#err"]);
  };

  /** Throw the error from this Result. */
  export function throwErr<T, E>(
    result: Result<T, E>,
  ): asserts result is Extract<Result<T, E>, { isOk: true }> {
    if (result.isErr) {
      throw result.unwrapErr();
    }
  }

  /** Wrap a function to return a Result instead of throwing. */
  export function wrap<E, F extends (...args: any[]) => any>(
    fn: F,
  ): (...args: Parameters<F>) => Result<ReturnType<F>, E> {
    return (...args: Parameters<F>) => {
      try {
        return Ok(fn(...args));
      } catch (error) {
        return Err(error as E);
      }
    };
  }

  /**
   * Wrap a Promise-returning function to return a Result instead of throwing.
   * @todo this may not work when there's an error before the first await in the function
   */
  export function wrapAsync<E, F extends (...args: any[]) => Promise<any>>(
    fn: F,
  ): (
    ...args: Parameters<F>
  ) => Promise<Result<PromiseValue<ReturnType<F>>, E>> {
    return (...args: Parameters<F>) => wrapPromise(fn(...args));
  }

  /** Wrap a Promise to return a Result instead of throwing. */
  export async function wrapPromise<T, E>(
    promise: Promise<T>,
  ): Promise<Result<T, E>> {
    try {
      return Ok(await promise);
    } catch (error) {
      return Err(error as E);
    }
  }

  export type OkType<R extends Result<any, any>> =
    R extends Result<infer T, any> ? T : never;

  export type ErrType<R extends Result<any, any>> =
    R extends Result<any, infer E> ? E : never;
}

export type SerializedResult<T, E> =
  | ({ "#err": E } & SerializedValue<typeof serializationKey>)
  | ({ "#ok": T } & SerializedValue<typeof serializationKey>);
