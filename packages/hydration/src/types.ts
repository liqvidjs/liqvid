/* variant configurations */
export interface BooleanVariant {
  false: React.ReactElement;
  true: React.ReactElement;
}

export interface ComparisonVariant<T> {
  children: React.ReactElement;
  eq?: T;
  gt?: T;
  gte?: T;
  lt?: T;
  lte?: T;
}

export type NumericVariant = ComparisonVariant<number>;

export interface StringVariant extends ComparisonVariant<string> {
  children: React.ReactElement;
  contains?: string;
}

export interface VariantsMap {
  boolean: BooleanVariant;
  number: NumericVariant[];
  string: StringVariant[];
}

export type ClientValueSource =
  | "cookie"
  | "custom"
  | "localStorage"
  | "search"
  | "search-then-messages"
  | "sessionStorage";

/* configuration */
export type SimpleSourceConfig = {
  name: string;

  /**
   * @default localStorage
   */
  source: Exclude<ClientValueSource, "custom" | "search-then-messages">;
};

export type CustomSourceConfig<T> = {
  name: "";
  source: "custom";
  options: {
    get: () => T;
    /* biome-ignore lint/suspicious/noExplicitAny: using T here makes the type
     * bivariant which breaks usePersistentState and I haven't figured out how
     * to fix that */
    set?: (_value: any) => void;
  };
};

export type SearchThenMessagesConfig<T> = {
  name: string;
  source: "search-then-messages";
  options: {
    incoming: (m: MessageEvent) => { new: T } | undefined;
  };
};

export type SourceConfig<T> =
  | SimpleSourceConfig
  | CustomSourceConfig<T>
  | SearchThenMessagesConfig<T>;

export type BooleanValueConfig = SourceConfig<boolean> & {
  default?: boolean;
  type: "boolean";
};

export type NumericValueConfig = SourceConfig<number> & {
  default?: number;
  type: "number";
};

export type StringValueConfig<T extends string = string> = SourceConfig<T> & {
  default?: T;
  enum?: readonly T[];
  type?: "string";
};

export type LocalValueConfig =
  | BooleanValueConfig
  | NumericValueConfig
  | StringValueConfig;

export type ArgType<C extends LocalValueConfig> = C["type"] extends "boolean"
  ? boolean | ("default" extends keyof C ? never : null)
  : C["type"] extends "number"
    ? number | ("default" extends keyof C ? never : null)
    :
        | (C extends StringValueConfig<infer E> ? E : string)
        | ("default" extends keyof C ? never : null);
