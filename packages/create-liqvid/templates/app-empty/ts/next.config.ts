import type { NextConfig } from "next";
import type { Header } from "next/dist/lib/load-custom-routes";

const isDevelopment = process.env.NODE_ENV === "development";

const basePageExtensions = ["js", "jsx", "ts", "tsx"];

const developmentConfig: NextConfig = {
  async headers() {
    /**
     * Ensure that the window is cross-origin isolated in development, permitting access
     * to higher-precision `performance.now()`. Without this, your marker timings will not
     * line up precisely with your audio.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated
     */
    const crossOriginIsolationHeader: Header = {
      headers: [
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
      ],
      // matching all routes
      source: "/(.*)",
    };

    if (isDevelopment) {
      return [crossOriginIsolationHeader];
    }

    return [];
  },

  // this is to exclude the Liqvid development server
  // from being included in the production build
  // https://github.com/vercel/next.js/discussions/51891#discussioncomment-6297178
  pageExtensions: isDevelopment
    ? [...basePageExtensions, "dev-only.ts", "dev-only.tsx"]
    : basePageExtensions,
};

const productionConfig: NextConfig = {
  // the typical use-case for Liqvid is exporting a static site
  output: "export",

  trailingSlash: true,
};

const nextConfig: NextConfig = {
  // in case you are deploying your site to a subdirectory
  basePath: process.env.NEXT_PUBLIC_BASE_PATH,

  turbopack: {
    // enable importing these as plaintext
    rules: {
      "*.{css,js}": {
        as: "*.js",
        condition: {
          query: /[?&]raw(?=&|$)/,
        },
        loaders: ["raw-loader"],
      },
      "*.{html,tex}": {
        as: "*.js",
        loaders: ["raw-loader"],
      },
      "*.svg": {
        as: "*.js",
        loaders: ["@svgr/webpack"],
      },
    },
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  ...(isDevelopment ? developmentConfig : productionConfig),

  /* config options here */
};

export default nextConfig;
