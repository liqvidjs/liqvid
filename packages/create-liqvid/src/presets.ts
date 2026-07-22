type Preset = {
  /** Human-readable label shown in the CLI. */
  title: string;
  dependencies?: string[];
  devDependencies?: string[];
};

const CODEMIRROR_BASE = [
  "@codemirror/autocomplete",
  "@codemirror/commands",
  "@codemirror/language",
  "@codemirror/lint",
  "@codemirror/search",
  "@codemirror/state",
  "@codemirror/view",
  "@fsegurai/codemirror-theme-bundle",
  "@lezer/highlight",
  "@lqv/codemirror",
  "@lqv/livecode",
  "@replit/codemirror-vim",
  "jszip",
  "prettier",
  "zustand",
];

const CODEMIRROR_BASE_DEV = ["type-fest"];

const THREE_BASE = [
  "@react-three/drei",
  "@react-three/fiber",
  "three",
  "three-stdlib",
];

export const PRESETS = {
  "coding-html": {
    dependencies: [
      ...CODEMIRROR_BASE,
      "@codemirror/lang-css",
      "@codemirror/lang-html",
      "@codemirror/lang-javascript",
    ],
    devDependencies: [...CODEMIRROR_BASE_DEV],
    title: "Coding › vanilla HTML",
  },
  "coding-python": {
    dependencies: [...CODEMIRROR_BASE, "@codemirror/lang-python", "skulpt"],
    devDependencies: [...CODEMIRROR_BASE_DEV],
    title: "Coding › Python",
  },
  "coding-shaders": {
    dependencies: [
      ...CODEMIRROR_BASE,
      "prettier-plugin-glsl",
      "shader-sandbox",
    ],
    devDependencies: [...CODEMIRROR_BASE_DEV],
    title: "Coding › Shaders",
  },
  "coding-tsx": {
    dependencies: [
      ...CODEMIRROR_BASE,
      "@codemirror/lang-css",
      "@codemirror/lang-html",
      "@codemirror/lang-javascript",
    ],
    devDependencies: [...CODEMIRROR_BASE_DEV],
    title: "Coding › TypeScript-React (TSX)",
  },
  "math-2d": {
    title: "Math › 2d graphics",
  },
  "math-3d": {
    dependencies: [...THREE_BASE],
    devDependencies: ["@types/three"],
    title: "Math › 3d graphics",
  },
  "math-diagrams": {
    dependencies: ["@liqvid/mathjax", "mathjax"],
    title: "Math › commutative diagrams",
  },
  "math-equations": {
    title: "Math › equations and handwriting",
  },
} satisfies Record<string, Preset>;

export type PresetName = keyof typeof PRESETS;

/** All valid preset ids. */
export const PRESET_NAMES = Object.keys(PRESETS) as PresetName[];

/** Type guard for whether a string is a valid preset id. */
export function isPresetName(value: string): value is PresetName {
  return value in PRESETS;
}

/** The human-readable title for a preset. */
export function presetTitle(name: PresetName): string {
  return PRESETS[name].title;
}

/** The `dependencies` declared by a preset (empty if none). */
export function presetDependencies(name: PresetName): string[] {
  return (PRESETS[name] as Preset).dependencies ?? [];
}

/** The `devDependencies` declared by a preset (empty if none). */
export function presetDevDependencies(name: PresetName): string[] {
  return (PRESETS[name] as Preset).devDependencies ?? [];
}
