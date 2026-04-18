import type { LocalValueConfig } from "liqvid";

/* -------------------- configure persistent settings -------------------- */
export const persistCaptions = {
	default: false as const,
	name: "liqvid.captions-enabled",
	source: "localStorage",
	type: "boolean",
} satisfies LocalValueConfig;

export const persistColorScheme = {
	default: "light" as const,
	enum: ["light", "dark"] as const,
	name: "liqvid.color-scheme",
	source: "localStorage",
	type: "string",
} satisfies LocalValueConfig;

export const persistMute = {
	default: false,
	name: "liqvid.muted",
	source: "localStorage",
	type: "boolean",
} satisfies LocalValueConfig;

export const persistVolume = {
	default: 1,
	name: "liqvid.volume",
	source: "localStorage",
	type: "number",
} satisfies LocalValueConfig;
