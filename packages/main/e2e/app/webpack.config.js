const TerserPlugin = require("terser-webpack-plugin");
const path = require("path");
const env = process.env.NODE_ENV || "development";
require("dotenv").config({ path: "../../.env" });
const webpack = require("webpack");

module.exports = {
  // necessary due to bug in old versions of mobile Safari
  devtool: false,
  entry: `./src/index.tsx`,

  mode: env,

  module: {
    rules: [
      {
        loader: "ts-loader",
        test: /\.[jt]sx?$/,
      },
    ],
  },

  optimization: {
    emitOnErrors: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          safari10: true,
        },
      }),
    ],
  },
  output: {
    filename: "bundle.js",
    path: path.join(__dirname, "static"),
  },

  plugins: [new webpack.EnvironmentPlugin(["PLAYWRIGHT_TEST_VIDEO"])],

  resolve: {
    alias: {
      "@env": path.join(__dirname, "src", "@" + env),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
};
