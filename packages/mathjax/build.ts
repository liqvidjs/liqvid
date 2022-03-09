import {rollup} from "rollup";
import {promises as fsp} from "fs";
import * as path from "path";

const external = ["liqvid", "react", "react/jsx-runtime"];

async function build() {
  const bundle = await rollup({
    external,
    input: "./dist/esm/index.js",
    plugins: [
      // @ts-ignore
      // outputPlugin(compiled, ".js", pkg.lezer ? (await import("@lezer/generator/rollup")).lezer() : {name: "dummy"})
    ]
  })
  const result = await bundle.generate({
    format: "esm"
  });

  for (const file of result.output) {
    let content = (file as any).code || (file as any).source;
    await fsp.writeFile(path.join("test", file.fileName), content)
  }
}

build();
