import type { SerializedDuration } from "@liqvid/duration";
import { Duration } from "@liqvid/duration";
import { DurationOptions } from "@liqvid/duration/effect";
import { Effect, Schema, Struct } from "effect";
import { SchemaRelativeDir } from "effect-paths";

import { AspectRatioSpecifier } from "./misc/aspect-ratio.mts";

/** Root or project-level parameter definitions. */
export type ParameterConfig = Readonly<
  Record<string, readonly string[]>
>;

/**
 * A single entry in a parametrized value array.
 * Contains a `"value"` key with the value, plus additional keys
 * matching parameter names.
 *
 * Example: `{ "lang": "en", "value": "Spaces" }`
 *
 * **Note:** `"value"` is reserved and must not be used as a parameter name.
 */
export const ParametrizedValueEntry = <T, E, RD, RE>(
  value: Schema.Codec<T, E, RD, RE>,
) =>
  Schema.StructWithRest(Schema.Struct({ value }), [
    // The `value` field is also covered by a string-keyed rest schema. Unknown
    // keeps the rest compatible with parametrized values such as booleans.
    Schema.Record(Schema.String, Schema.Unknown),
  ]);

export type ParametrizedValueEntry<
  T,
  Parameters extends ParameterConfig | undefined = undefined,
> = {
  readonly value: T;
} & (Parameters extends ParameterConfig
  ? { readonly [K in keyof Parameters]: Parameters[K][number] }
  : unknown);

export type Parametrized<
  T,
  Parameters extends ParameterConfig | undefined = undefined,
> =
  | T
  | readonly ParametrizedValueEntry<T, Parameters>[];

type ProjectFields<Parameters extends ParameterConfig | undefined> = {
  description?: Parametrized<string, Parameters>;
  draft: Parametrized<boolean, Parameters>;
  title: Parametrized<string, Parameters>;
};

/** A project with parametrized fields keyed by `Parameters`. */
export type Project<Parameters extends ParameterConfig | undefined = undefined> = Omit<
  (typeof ProjectJson)["Type"],
  keyof ProjectFields<Parameters>
> &
  ProjectFields<Parameters>;

/**
 * A string that can optionally vary by parameter values.
 *
 * - Plain form: `"My Title"`
 * - Parametrized form: `[{ "lang": "en", "value": "Spaces" }, { "lang": "fr", "value": "Espaces" }]`
 *
 * When parameters are defined (at root or project level), use the array form
 * to provide different values for different parameter combinations.
 *
 * **Note:** `"value"` is reserved and must not be used as a parameter name.
 */
export const Parametrized = <T, E, RD, RE>(value: Schema.Codec<T, E, RD, RE>) =>
  Schema.Union([value, Schema.Array(ParametrizedValueEntry(value))]);

/** project.json files */
export const ProjectJson = Schema.Struct({
  $schema: Schema.String.pipe(Schema.optional),

  /** aspect ratio of project */
  aspectRatio: AspectRatioSpecifier.pipe(
    Schema.withDecodingDefaultType(
      Effect.succeed({
        height: 9,
        width: 16,
      }),
    ),
    Schema.annotate({ description: "Aspect ratio of project" }),
  ),

  /** Description of the project. Supports parametrized form. */
  description: Parametrized(Schema.String).pipe(
    Schema.optional,
    Schema.annotate({
      description: "Description of the project. Supports parametrized form.",
    }),
  ),

  /** Set this to true, or parametrize it, to omit the project from production. */
  draft: Parametrized(Schema.Boolean).pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),

    Schema.annotateEncoded({
      description:
        "Set this to true, or parametrize it, to omit the project from production.",
    }),

    Schema.annotate({
      description:
        "Set this to true, or parametrize it, to omit the project from production.",
    }),
  ),

  /**
   * Static parameters for this project.
   *
   * **Note:** `"value"` is not permitted as a parameter name, since it is
   * reserved for use in {@link ParametrizedString} entries.
   */
  parameters: Schema.Record(Schema.String, Schema.Array(Schema.String)).pipe(
    Schema.optional,
    Schema.annotate({
      description:
        'Static parameters for this project. Note: "value" is not permitted as a parameter name.',
    }),
  ),

  /** Name of the project */
  title: Parametrized(Schema.String).pipe(
    Schema.annotate({ description: "Name of the project" }),
  ),
});

export type ProjectJson<Parameters extends ParameterConfig | undefined = undefined> =
  Project<Parameters>;

/**
 * auto-generated project-meta.json files
 */
export const AutoGenProjectMeta = Schema.Struct({
  /** duration of project */
  duration: DurationOptions.pipe(
    Schema.annotate({ description: "Duration of project" }),
  ),
});
export type AutoGenProjectMeta = (typeof AutoGenProjectMeta)["Type"];

export const ProjectMeta = ProjectJson.mapFields(Struct.map(Schema.toType))
  .mapFields(Struct.omit(["$schema"]))
  .mapFields(
    Struct.evolve({
      draft: (field) =>
        field.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
      title: (field) => Schema.optional(field),
    }),
  )
  .pipe(
    Schema.fieldsAssign({
      duration: DurationOptions.pipe(
        Schema.decodeTo(Schema.instanceOf(Duration)),
      ),

      path: SchemaRelativeDir,

      socials: Schema.Struct({
        liqvidStudio: Parametrized(Schema.Boolean).pipe(Schema.mutableKey),
        openGraph: Schema.Boolean.pipe(Schema.mutableKey),
        twitter: Schema.Boolean.pipe(Schema.mutableKey),
      }),
    }),
  );

export type ProjectMeta = (typeof ProjectMeta)["Type"];

/**
 * Wire representation of {@link ProjectMeta}. The `duration` field carries the
 * `@liqvid/duration` serialization marker so it can be revived with
 * `deserialize` on the client.
 */
export type SerializedProjectMeta = Omit<ProjectMeta, "duration"> & {
  duration: SerializedDuration;
};

/** Record of selected parameter values */
export type ParameterValues = Readonly<Record<string, string>>;
