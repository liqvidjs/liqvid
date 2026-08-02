import type { AbsoluteDir, RelativeDir, RelativeFile } from "effect-paths";

import type { PackageManager } from "../src/helpers/get-pkg-manager.ts";
import type { PresetName } from "../src/presets.ts";

export type TemplateType =
  | "app"
  | "app-empty"
  | "app-tw"
  | "app-tw-empty"
  | "default"
  | "default-empty"
  | "default-tw"
  | "default-tw-empty";

export interface GetTemplateFileArgs {
  template: RelativeDir<TemplateType>;
  file: RelativeFile;
}

export interface InstallTemplateArgs {
  appName: string;
  root: AbsoluteDir;
  packageManager: PackageManager;
  isOnline: boolean;
  template: RelativeDir<TemplateType>;
  tailwind: boolean;
  skipInstall: boolean;
  bundler: Bundler;
  reactCompiler: boolean;
  /** Whether to set up the project to use Portless for local development. */
  portless: boolean;
  /** Presets selected by the user, whose deps + content will be included. */
  presets?: PresetName[];
}

export const Bundler = {
  Rspack: "rspack",
  Turbopack: "turbopack",
  Webpack: "webpack",
};

export type Bundler = (typeof Bundler)[keyof typeof Bundler];
