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
  file: RelativeFile;
  template: RelativeDir<TemplateType>;
}

export interface InstallTemplateArgs {
  appName: string;
  bundler: Bundler;
  isOnline: boolean;
  packageManager: PackageManager;
  /** Whether to set up the project to use Portless for local development. */
  portless: boolean;
  /** Presets selected by the user, whose deps + content will be included. */
  presets?: PresetName[];
  reactCompiler: boolean;
  root: AbsoluteDir;
  skipInstall: boolean;
  tailwind: boolean;
  template: RelativeDir<TemplateType>;
}

export const Bundler = {
  Rspack: "rspack",
  Turbopack: "turbopack",
  Webpack: "webpack",
};

export type Bundler = (typeof Bundler)[keyof typeof Bundler];
