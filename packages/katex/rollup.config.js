import dts from "rollup-plugin-dts";

const external = ["@liqvid/utils/react", "react", "react/jsx-runtime.js"];

export default [
  // index
  {
    external: [...external, "liqvid"],
    input: "dist/esm/index.mjs",

    output: [
      // ESM
      {file: "./dist/index.mjs", format: "esm"},
      // CJS
      {file: "./dist/index.cjs", format: "cjs"}
    ]
  },
  // plain
  {
    external,
    input: "dist/esm/plain.mjs",

    output: [
      // ESM
      {file: "./dist/plain.mjs", format: "esm"},
      // CJS
      {file: "./dist/plain.cjs", format: "cjs"}
    ]
  },
  // index types
  {
    input: "dist/types/index.d.ts",
    plugins: [dts()],
    output: {
      file: "dist/index.d.ts",
      format: "es"
    }
  },
  // plain types
  {
    input: "dist/types/plain.d.ts",
    plugins: [dts()],
    output: {
      file: "dist/plain.d.ts",
      format: "es"
    }
  }
]
