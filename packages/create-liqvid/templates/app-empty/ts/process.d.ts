declare namespace NodeJS {
	export interface ProcessEnv {
		/**
		 * Only environment variables explicitly defined in this file will be recognized.
		 * @deprecated not really "deprecated", just using this flag to trigger a warning in the IDE
		 */
		[key: string]: {
			__error: "environment variables must be declared in process.d.ts";
		};

		// NOTE: Only variables prefixed with `NEXT_PUBLIC` will be exposed to the
		// frontend. This behavior is a part of Next.js.
		// https://nextjs.org/docs/app/guides/environment-variables#bundling-environment-variables-for-the-browser

		/**
		 * Base from which media content is served in production.
		 * This variable is automatically set during the build process.
		 */
		NEXT_PUBLIC_LIQVID_MEDIA_BASE: string;
	}
}
