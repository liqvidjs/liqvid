/* variant configurations */
export interface BooleanVariant {
  false: React.ReactElement;
  true: React.ReactElement;
}

export interface ComparisonVariant<T> {
  eq?: T;
  gt?: T;
  gte?: T;
  lt?: T;
  lte?: T;
  children: React.ReactElement;
}

export type NumericVariant = ComparisonVariant<number>;

export interface StringVariant extends ComparisonVariant<string> {
  contains?: string;
  children: React.ReactElement;
}

export interface VariantsMap {
  boolean: BooleanVariant;
  number: NumericVariant[];
  string: StringVariant[];
}

export type ClientValueSource = "cookie" | "localStorage" | "search";

/* configuration */
interface BaseValueConfig {
  name: string;

  /**
   * @default localStorage
   */
  source: ClientValueSource;
}

export interface BooleanValueConfig extends BaseValueConfig {
  default?: boolean;
  type: "boolean";
}

export interface NumericValueConfig extends BaseValueConfig {
  default?: number;
  type: "number";
}

export interface StringValueConfig<T extends string = string>
  extends BaseValueConfig {
  default?: T;
  enum?: readonly T[];
  type?: "string";
}

export type LocalValueConfig =
  | BooleanValueConfig
  | NumericValueConfig
  | StringValueConfig;

export type ArgType<C extends LocalValueConfig> = C["type"] extends "boolean"
  ? boolean | ("default" extends keyof C ? never : null)
  : C["type"] extends "number"
    ? number | ("default" extends keyof C ? never : null)
    :
        | ("enum" extends keyof C
            ? C["enum"] extends ReadonlyArray<infer E>
              ? E
              : never
            : string)
        | ("default" extends keyof C ? never : null);
