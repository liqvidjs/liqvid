const TerserPlugin = require("terser-webpack-plugin");
const path = require("path");
const env = process.env.NODE_ENV || "development";
require("dotenv").config({path: "../../.env"});
const webpack = require("webpack");

module.exports = {
  entry: `./src/index.tsx`,
  output: {
    filename: "bundle.js",
    path: path.join(__dirname, "static"),
  },

  mode: env,

  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        loader: "ts-loader",
      },
    ],
  },

  plugins: [new webpack.EnvironmentPlugin(["PLAYWRIGHT_TEST_VIDEO"])],

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
      "@env": path.join(__dirname, "src", "@" + env),
    },
  },
};
