import path from "node:path";

import { Effect, FileSystem, Schema } from "effect";
import { type AbsoluteDir, RelativeFile } from "effect-paths";

export const JsonFile = Schema.TemplateLiteral([Schema.String, ".json"]).pipe(
  Schema.fromBrand("RelativeFile", RelativeFile),
);

type JsonFile = (typeof JsonFile)["Type"];

type JsonFilePair = Readonly<{
  dirname: AbsoluteDir;
  filename: JsonFile;
}>;

/**
 * Remove a JSON file along with its adjacent `.d.json.ts` file
 */
export const deleteTypedJson = Effect.fnUntraced(function* ({
  dirname,
  filename,
}: JsonFilePair) {
  const fs = yield* FileSystem.FileSystem;

  const jsonPath = path.join(dirname, filename);
  const dtsPath = path.join(
    dirname,
    RelativeFile(filename.replace(/\.json$/, ".d.json.ts")),
  );

  yield* Effect.all([fs.remove(jsonPath), fs.remove(dtsPath)], {
    concurrency: "unbounded",
  });
});

/**
 * Rename a JSON file along with its adjacent `.d.json.ts` file
 */
export const renameTypedJson = Effect.fnUntraced(function* (
  from: JsonFilePair,
  to: JsonFilePair,
) {
  const fs = yield* FileSystem.FileSystem;

  const oldJsonPath = path.join(from.dirname, from.filename);
  const oldDtsPath = path.join(
    from.dirname,
    RelativeFile(from.filename.replace(/\.json$/, ".d.json.ts")),
  );

  const newJsonPath = path.join(to.dirname, to.filename);
  const newDtsPath = path.join(
    to.dirname,
    RelativeFile(to.filename.replace(/\.json$/, ".d.json.ts")),
  );

  yield* Effect.all(
    [fs.rename(oldJsonPath, newJsonPath), fs.rename(oldDtsPath, newDtsPath)],
    { concurrency: "unbounded" },
  );
});

/**
 * Write a JSON file along with an adjacent `.d.json.ts` file specifying its shape.
 */
export const writeTypedJson = Effect.fnUntraced(function* ({
  data,
  declaration,
  dirname,
  filename,

  pretty = false,
}: JsonFilePair & {
  data: unknown;
  declaration: string;
  pretty?: boolean;
}) {
  const fs = yield* FileSystem.FileSystem;

  const jsonPath = path.join(dirname, filename);
  const dtsPath = path.join(
    dirname,
    RelativeFile(filename.replace(/\.json$/, ".d.json.ts")),
  );

  yield* Effect.all(
    [
      fs.writeFileString(
        jsonPath,
        JSON.stringify(data, null, pretty ? 2 : undefined),
      ),
      fs.writeFileString(dtsPath, declaration),
    ],
    { concurrency: "unbounded" },
  );
});

export function inlineTypeDeclaration(declaration: string) {
  return `declare const data: ${declaration};\nexport default data;`;
}
