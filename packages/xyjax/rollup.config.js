import dts from "rollup-plugin-dts";

const external = [
  "@liqvid/mathjax",
  "@liqvid/utils/animation",
  "@liqvid/utils/misc",
  "liqvid",
  "react"
];

export default [
  // index
  {
    external,
    input: "dist/esm/index.mjs",

    output: [
      // ESM
      {file: "./dist/index.mjs", format: "esm"},
      // CJS
      {file: "./dist/index.cjs", format: "cjs"}
    ]
  },
  // types
  {
    input: "dist/types/index.d.ts",
    plugins: [dts()],
    output: {
      file: "dist/index.d.ts",
      format: "es"
    }
  }
];
