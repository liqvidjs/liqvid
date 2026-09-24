import { Schema, SchemaTransformation } from "effect";

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
