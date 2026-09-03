import path from "node:path";

import { Effect, FileSystem, Schema } from "effect";
import { type AbsoluteDir, RelativeFile } from "effect-paths";

export const JsonFile = Schema.TemplateLiteral([Schema.String, ".json"]).pipe(
  Schema.fromBrand("RelativeFile", RelativeFile),
);

type JsonFile = (typeof JsonFile)["Type"];

/**
 * Write a JSON file along with an adjacent `.d.ts` file specifying its type.
 */
export const writeTypedJson = Effect.fnUntraced(function* ({
  data,
  declaration,
  dirname,
  filename,

  pretty = false,
}: {
  data: unknown;
  declaration: string;
  dirname: AbsoluteDir;
  filename: JsonFile;

  pretty?: boolean;
}) {
  const fs = yield* FileSystem.FileSystem;

  const jsonPath = path.join(dirname, filename);
  const dtsPath = path.join(
    dirname,
    RelativeFile(filename.replace(/\.json$/, ".d.json.ts")),
  );

  yield* Effect.all([
    fs.writeFileString(
      jsonPath,
      JSON.stringify(data, null, pretty ? 2 : undefined),
    ),
    fs.writeFileString(dtsPath, declaration),
  ]);
});
