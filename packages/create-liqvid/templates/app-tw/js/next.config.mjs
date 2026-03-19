const isDevelopment = process.env.NODE_ENV === "development";

const basePageExtensions = ["js", "jsx", "ts", "tsx"];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // in case you are deploying your site to a subdirectory
  basePath: process.env.NEXT_PUBLIC_BASE_PATH,

  // https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },

  async headers() {
    /**
     * Ensure that the window is cross-origin isolated in development, permitting access
     * to higher-precision `performance.now()`. Without this, your marker timings will not
     * line up precisely with your audio.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated
     */
    const crossOriginIsolationHeader = {
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

  // the typical use-case for Liqvid is exporting a static site
  output: isDevelopment ? undefined : "export",

  // this is to exclude the Liqvid development server
  // from being included in the production build
  // https://github.com/vercel/next.js/discussions/51891#discussioncomment-6297178
  pageExtensions: isDevelopment
    ? [...basePageExtensions, "dev-only.ts", "dev-only.tsx"]
    : basePageExtensions,

  // react
  reactCompiler: true,

  turbopack: {
    // enable importing .tex files
    rules: {
      "*.tex": {
        as: "*.js",
        loaders: ["raw-loader"],
      },
    },
  },

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
