import fsp from "node:fs/promises";
import path from "node:path";

export async function writeTypedJson({
  declaration,
  dirname,
  filename,
  data,
  pretty = false,
}: {
  declaration: string;
  dirname: string;
  filename: `${string}.json`;
  data: unknown;
  pretty?: boolean;
}): Promise<void> {
  const jsonPath = path.join(dirname, filename);
  const dtsPath = path.join(dirname, filename.replace(/\.json$/, ".d.json.ts"));

  await Promise.all([
    fsp.writeFile(jsonPath, JSON.stringify(data, null, pretty ? 2 : undefined)),
    fsp.writeFile(dtsPath, declaration),
  ]);
}
