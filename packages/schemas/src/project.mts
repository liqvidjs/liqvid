import type { SerializedDuration } from "@liqvid/duration";
import { Duration } from "@liqvid/duration";
import { DurationOptions } from "@liqvid/duration/effect";
import { Effect, Schema, SchemaTransformation } from "effect";
import { SchemaRelativeDir } from "effect-paths";

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
    Schema.Record(Schema.String, Schema.String),
  ]);

export type ParametrizedValueEntry<T> = ReturnType<
  typeof ParametrizedValueEntry<T, T, never, never>
>["Type"];
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
export const Parametrized = <T, E, RD, RE>(
  value: Schema.Codec<T, E, RD, RE>,
) =>
  Schema.Union([value, Schema.Array(ParametrizedValueEntry(value))]);

export type Parametrized<T> = ReturnType<
  typeof Parametrized<T, T, never, never>
>["Type"];

export const AspectRatio = Schema.Struct({
  height: Schema.Number,
  width: Schema.Number,
});
export type AspectRatio = (typeof AspectRatio)["Type"];

export const AspectRatioSpecifier = Schema.Union([
  Schema.Literal("square"),
  Schema.Literal("video"),
  Schema.TemplateLiteral([Schema.Number, ":", Schema.Number]),
  Schema.Tuple([Schema.Number, Schema.Number]),
  AspectRatio,
]).pipe(
  Schema.decodeTo(
    AspectRatio,
    SchemaTransformation.transform({
      decode: (from) => {
        if (typeof from === "string") {
          if (from === "video") {
            return { height: 9, width: 16 };
          }

          if (from === "square") {
            return { height: 1, width: 1 };
          }

          const [width, height] = from.split(":").map(Number) as [
            number,
            number,
          ];
          return { height, width };
        } else if (Array.isArray(from)) {
          const [width, height] = from;
          return { height, width };
        } else {
          // https://github.com/microsoft/TypeScript/issues/17002
          return from as AspectRatio;
        }
      },
      encode: (to) => to,
    }),
  ),
);
export type AspectRatioSpecifier = (typeof AspectRatioSpecifier)["Encoded"];

/**
 * project.json files
 */
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

  /** Set this to true to omit the project from the production build. */
  draft: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),

    Schema.annotateEncoded({
      description:
        "Set this to true to omit the project from the production build.",
    }),

    Schema.annotate({
      description:
        "Set this to true to omit the project from the production build.",
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

export type ProjectJson = (typeof ProjectJson)["Type"];

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

export const ProjectMeta = Schema.Struct({
  aspectRatio: AspectRatio,

  /** Description of the project. Supports parametrized form. */
  description: Parametrized(Schema.String).pipe(
    Schema.optional,
    Schema.annotate({
      description: "Description of the project. Supports parametrized form.",
    }),
  ),

  duration: DurationOptions.pipe(Schema.decodeTo(Schema.instanceOf(Duration))),

  /**
   * Static parameters for this project. Used to interpolate path parameters
   * when linking to projects. Format: `{ parameterName: [value1, value2, ...] }`
   */
  parameters: Schema.Record(Schema.String, Schema.Array(Schema.String)).pipe(
    Schema.optional,
    Schema.annotate({
      description:
        "Static parameters for this project. Used to interpolate path parameters when linking to projects. Format: { parameterName: [value1, value2, ...] }",
    }),
  ),

  path: SchemaRelativeDir,

  socials: Schema.Struct({
    liqvidStudio: Parametrized(Schema.Boolean).pipe(Schema.mutableKey),
    openGraph: Schema.Boolean.pipe(Schema.mutableKey),
    twitter: Schema.Boolean.pipe(Schema.mutableKey),
  }),

  /** Title of the project. Supports parametrized form. Falls back to `name` if not specified. */
  title: Parametrized(Schema.String).pipe(
    Schema.optional,
    Schema.annotate({
      description:
        'Title of the project. Supports parametrized form. Falls back to "name" if not specified.',
    }),
  ),
});

export type ProjectMeta = (typeof ProjectMeta)["Type"];

/**
 * Wire representation of {@link ProjectMeta}. The `duration` field carries the
 * `@liqvid/duration` serialization marker so it can be revived with
 * `deserialize` on the client.
 */
export type SerializedProjectMeta = Omit<ProjectMeta, "duration"> & {
  duration: SerializedDuration;
};

/**
 * Root parameters type for the liqvid.json configuration.
 * Format: `{ parameterName: [value1, value2, ...] }`
 */
export type RootParameters = Readonly<Record<string, readonly string[]>>;
