const webpack = require("webpack");
// const {CheckerPlugin} = require("awesome-typescript-loader");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  entry: `${__dirname}/src/index.ts`,
  output: {
    filename: process.env.NODE_ENV === "development" ? "ractive-player.js" : "ractive-player.min.js",
    path: `${__dirname}/dist`,
    library: "RactivePlayer"
  },

  devtool: false,

  externals: {
    "prop-types": "PropTypes",
    "react": "React",
    "react-dom": "ReactDOM"
  },

  mode: process.env.NODE_ENV,

  module: {
    rules: [
     {
        test: /\.tsx?$/,
        loader: "ts-loader",
        // options: {
        //   configFileName: `${__dirname}/tsconfig.json`
        // }
      }
    ]
  },

  optimization: {
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          safari10: true
        }
      })
    ],
    noEmitOnErrors: false
  },

  plugins: [
    // new CheckerPlugin(),
    new webpack.BannerPlugin({
      banner: () => require("fs").readFileSync("./LICENSE", {encoding: "utf8"})
    })
  ],

  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"]
  }
};
