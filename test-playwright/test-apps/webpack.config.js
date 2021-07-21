const TerserPlugin = require("terser-webpack-plugin");
const fs = require("fs");
const path = require("path");

const project_root = path.resolve(__dirname, "../..");
fs.mkdirSync("bundles", { recursive: true });

function getconfig(name) {
  const stem = name.slice(0, -".tsx".length);
  return {
    entry: path.resolve(__dirname, `./${name}`),
    output: {
      filename: `bundles/${stem}.js`,
      path: __dirname,
    },

    externals: {
      liqvid: "Liqvid",
      "ractive-player": "RactivePlayer",
      react: "React",
      "react-dom": "ReactDOM",
    },

    mode: "production",

    module: {
      rules: [
        {
          test: /\.[jt]sx?$/,
          loader: "ts-loader",
        },
      ],
    },

    // necessary due to bug in old versions of mobile Safari
    devtool: false,

    optimization: {
      minimizer: [
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            safari10: true,
          },
        }),
      ],
      emitOnErrors: true,
    },

    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
      alias: {
        liqvidjs: path.resolve(project_root, "src/index"),
      },
    },
  };
}

module.exports = fs
  .readdirSync(__dirname)
  .filter((x) => x.endsWith("tsx"))
  .map(getconfig);
