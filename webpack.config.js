const webpack = require('webpack');
const {CheckerPlugin} = require('awesome-typescript-loader')

module.exports = {
  entry: `${__dirname}/src/index.ts`,
  output: {
    filename: 'ractive-player.js',
    path: `${__dirname}/dist`,
    library: 'RactivePlayer'
  },

  externals: {
    "chrome": "chrome",
    "mathjax": "MathJax",
    "prop-types": "PropTypes",
    "react": "React",
    "react-dom": "ReactDOM",
    "three": "THREE"
  },

  mode: process.env.NODE_ENV,

  module: {
    rules: [
     {
        test: /\.[jt]sx?$/,
        loader: "awesome-typescript-loader",
        options: {
          configFileName: `${__dirname}/tsconfig.json`
        }
      }
    ]
  },

  optimization: {
    noEmitOnErrors: false
  },

  plugins: [
    new CheckerPlugin(),
    new webpack.BannerPlugin({
      banner: () => require('fs').readFileSync('./LICENSE', {encoding: 'utf8'})
    })
  ],

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
  }
};
