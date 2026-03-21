const isDevelopment = process.env.NODE_ENV === "development";

const basePageExtensions = ["js", "jsx", "ts", "tsx"];

/** @type {import('next').NextConfig} */
const developmentConfig = {
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

	// this is to exclude the Liqvid development server
	// from being included in the production build
	// https://github.com/vercel/next.js/discussions/51891#discussioncomment-6297178
	pageExtensions: isDevelopment
		? [...basePageExtensions, "dev-only.ts", "dev-only.tsx"]
		: basePageExtensions,
};

/** @type {import('next').NextConfig} */
const productionConfig = {
	// the typical use-case for Liqvid is exporting a static site
	output: "export",
};

/** @type {import('next').NextConfig} */
const nextConfig = {
	// in case you are deploying your site to a subdirectory
	basePath: process.env.NEXT_PUBLIC_BASE_PATH,

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

	...(isDevelopment ? developmentConfig : productionConfig),

	/* config options here */
};

export default nextConfig;
