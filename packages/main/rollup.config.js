import {getBabelOutputPlugin} from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import {nodeResolve} from "@rollup/plugin-node-resolve";
import * as fs from "fs";
import dts from "rollup-plugin-dts";
import {terser} from "rollup-plugin-terser";

/* shared UMD config --- don't put plugins here bc array will get copied by reference */
const umdConfig = {
  banner: "/*!" + fs.readFileSync("./LICENSE", "utf8") + "*/",
  format: "esm",
  globals: {
    react: "React",
    "react-dom": "ReactDOM",
  },
};

// babel config
const babelConfig = () =>
  getBabelOutputPlugin({
    plugins: [
      [
        "@babel/plugin-transform-modules-umd",
        {
          globals: {
            react: "React",
            "react-dom": "ReactDOM",
          },
          moduleId: "Liqvid",
          moduleRoot: "Liqvid",
        },
      ],
    ],
    presets: [["@babel/env", {targets: {ios: "12"}}]],
  });

export default [
  {
    external: ["react", "react-dom"],
    input: "dist/esm/index.js",
    plugins: [nodeResolve({preferBuiltins: false}), commonjs()],

    output: [
      // ESM
      {file: "./dist/liqvid.mjs", format: "esm"},
      // UMD development
      {
        ...umdConfig,
        file: "./dist/liqvid.js",
        plugins: [babelConfig()],
      },
      // UMD production
      {
        ...umdConfig,
        file: "./dist/liqvid.min.js",
        plugins: [babelConfig(), terser({module: false, safari10: true})],
      },
    ],
  },
  // types
  {
    input: "dist/types/index.d.ts",
    plugins: [dts()],
    output: {
      file: "dist/liqvid.d.ts",
      format: "es",
    },
  },
];
