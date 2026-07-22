"use server";

import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { NodeFileSystem } from "@effect/platform-node";
import { runNextBuild } from "@liqvid/cli/build";
import { publishContent, publishMedia } from "@liqvid/cli/publish";
import { UP, writeJSON } from "@liqvid/cli/utils";
import type { AutoGenProjectMeta } from "@liqvid/schemas";
import { serialize } from "@liqvid/ssr";
import { Effect, Exit, FileSystem, type PlatformError } from "effect";
import {
  type AbsoluteDir,
  type AbsoluteFile,
  RelativeDir,
  RelativeFile,
} from "effect-paths";
import { execa } from "execa";
import Handlebars from "handlebars";

import {
  ASSETS_DIR,
  PROJECT_FILE,
  PROJECT_META_FILE,
  TEMPLATE_FILE,
  TYPES_AUTOGEN,
} from "../conventions.mts";
import { getServerState } from "../initialize.mts";
import { readDirWithFileTypes } from "../utils/effect.mts";
import { getRoutesDir } from "../utils/misc.mts";

export async function rebuildAction() {
  const { cwd } = getServerState();
  const result = await Effect.runPromiseExit(
    runNextBuild({ cwd }).pipe(Effect.provide(NodeFileSystem.layer)),
  );

  if (Exit.isSuccess(result)) {
    getServerState().lastBuildTime = Date.now();
  }

  return serialize(result) as typeof result;
}

export interface PublishActionResult {
  /** Error message when the operation failed */
  error?: string;

  /** Whether the operation succeeded */
  success: boolean;
}

/**
 * Publish content files (html/css/js). Equivalent to `liqvid publish --content`.
 */
export async function publishContentAction(): Promise<PublishActionResult> {
  const { cwd } = getServerState();

  try {
    await publishContent({ cwd });
    getServerState().lastBuildTime = Date.now();
    return { success: true };
  } catch (e) {
    console.error("Failed to publish content:", e);
    return {
      error: e instanceof Error ? e.message : "Unknown error",
      success: false,
    };
  }
}

/**
 * Publish media files. Equivalent to `liqvid publish --media`.
 */
export async function publishMediaAction(): Promise<PublishActionResult> {
  const { cwd } = getServerState();

  try {
    await publishMedia({ cwd });
    getServerState().lastBuildTime = Date.now();
    return { success: true };
  } catch (e) {
    console.error("Failed to publish media:", e);
    return {
      error: e instanceof Error ? e.message : "Unknown error",
      success: false,
    };
  }
}

/**
 * Publish both content and media files. Equivalent to `liqvid publish`.
 */
export async function publishAction(): Promise<PublishActionResult> {
  const { cwd } = getServerState();

  try {
    await publishContent({ cwd });
    await publishMedia({ cwd });
    getServerState().lastBuildTime = Date.now();
    return { success: true };
  } catch (e) {
    console.error("Failed to publish:", e);
    return {
      error: e instanceof Error ? e.message : "Unknown error",
      success: false,
    };
  }
}

export interface TemplateInfo {
  /** Unique identifier (directory name) */
  id: string;

  /** Display name from template.json */
  name: string;

  /** Whether this is the default template */
  default?: boolean;

  /** Full path to the template directory */
  path: AbsoluteDir;
}

interface CreateProjectInput {
  name: string;
  projectPath: RelativeDir;
  templateId: string;
}

interface CreateProjectResult {
  success: boolean;
  error?: string;
}

const TEMPLATES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  UP,
  UP,
  RelativeDir("templates"),
);

const PROJECT_TEMPLATES_DIR = path.join(TEMPLATES_DIR, RelativeDir("projects"));

/**
 * Open project in Finder
 */
export async function openInFinderAction(
  projectPath: RelativeDir,
): Promise<{ success: boolean }> {
  try {
    // Validate path to prevent directory traversal
    if (projectPath.includes("..")) {
      return { success: false };
    }
    const fullPath = path.join(getRoutesDir(), projectPath);
    await execa("open", [fullPath]);
    return { success: true };
  } catch (e) {
    console.error("Failed to open in Finder:", e);
    return { success: false };
  }
}

/**
 * Open a render folder in Finder
 */
export async function openRenderInFinderAction(
  projectPath: RelativeDir,
  renderId: string,
): Promise<{ success: boolean }> {
  try {
    // Validate paths to prevent directory traversal
    if (projectPath.includes("..") || renderId.includes("..")) {
      return { success: false };
    }
    const fullPath = path.join(
      getRoutesDir(),
      projectPath,
      ASSETS_DIR,
      RelativeDir("renders"),
      RelativeDir(renderId),
    );
    await execa("open", [fullPath]);
    return { success: true };
  } catch (e) {
    console.error("Failed to open render in Finder:", e);
    return { success: false };
  }
}

/**
 * Open captions folder in Finder
 */
export async function openCaptionsInFinderAction(
  projectPath: RelativeDir,
): Promise<{ success: boolean }> {
  try {
    // Validate path to prevent directory traversal
    if (projectPath.includes(UP)) {
      return { success: false };
    }
    const fullPath = path.join(
      getRoutesDir(),
      projectPath,
      ASSETS_DIR,
      RelativeDir("captions"),
    );
    await execa("open", [fullPath]);
    return { success: true };
  } catch (e) {
    console.error("Failed to open captions in Finder:", e);
    return { success: false };
  }
}

/**
 * Load all available project templates.
 * Templates are sorted with default first, then alphabetically by name.
 */
export async function loadTemplatesAction(): Promise<TemplateInfo[]> {
  const templates: TemplateInfo[] = [];

  try {
    const entries = await fsp.readdir(PROJECT_TEMPLATES_DIR, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const templateDir = path.join(PROJECT_TEMPLATES_DIR, entry.name);
      const templateJsonPath = path.join(templateDir, TEMPLATE_FILE);

      try {
        const content = await fsp.readFile(templateJsonPath, "utf8");
        const templateJson = JSON.parse(content) as {
          name: string;
          default?: boolean;
        };

        templates.push({
          default: templateJson.default === true,
          id: entry.name,
          name: templateJson.name,
          path: templateDir,
        });
      } catch {
        // Skip directories without valid template.json
      }
    }
  } catch {
    // If templates directory doesn't exist, return empty array
  }

  // Sort: default first, then alphabetically by name
  templates.sort((a, b) => {
    if (a.default && !b.default) return -1;
    if (!a.default && b.default) return 1;
    return a.name.localeCompare(b.name);
  });

  return templates;
}

/**
 * Compile a Handlebars template and write it to the output path.
 */
function compileTemplate(
  templatePath: AbsoluteFile,
  outputPath: AbsoluteFile,
  data: Record<string, unknown>,
) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const templateContent = yield* fs.readFileString(templatePath);
    const template = Handlebars.compile(templateContent);
    const result = template(data);
    yield* fs.writeFileString(outputPath, result);
  });
}

/**
 * Recursively copy and compile template files from source to destination.
 * Files ending in .hbs are compiled with Handlebars and have the .hbs extension removed.
 * Other files are copied as-is. template.json is skipped.
 */
function copyTemplateDir(
  srcDir: AbsoluteDir,
  destDir: AbsoluteDir,
  data: Record<string, unknown>,
): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    yield* fs.makeDirectory(destDir, { recursive: true });

    const entries = yield* readDirWithFileTypes(srcDir);

    for (const [basename, kind] of entries) {
      if (kind === "SymbolicLink") continue;

      if (basename === TEMPLATE_FILE) {
        // Skip template.json
        continue;
      }

      if (kind === "Directory") {
        const srcPath = path.join(srcDir, basename);
        const destPath = path.join(destDir, basename);

        yield* copyTemplateDir(srcPath, destPath, data);
      } else {
        const srcPath = path.join(srcDir, basename);
        const destName = basename.endsWith(".hbs")
          ? (basename.slice(0, -4) as RelativeFile)
          : basename;

        const destPath = path.join(destDir, destName);

        if (basename.endsWith(".hbs")) {
          yield* compileTemplate(srcPath, destPath, data);
        } else {
          yield* fs.copyFile(srcPath, destPath);
        }
      }
    }
  });
}

export async function createProjectAction(
  input: CreateProjectInput,
): Promise<CreateProjectResult> {
  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const { name, projectPath, templateId } = input;

      // Validate project path
      if (!projectPath || projectPath.includes("..")) {
        return { error: "Invalid project path", success: false };
      }

      // Validate and load template
      const templates = yield* Effect.promise(() => loadTemplatesAction());
      const template = templates.find((t) => t.id === templateId);
      if (!template) {
        return { error: "Template not found", success: false };
      }

      const fullProjectPath = path.join(getRoutesDir(), projectPath);

      const fs = yield* FileSystem.FileSystem;

      // Check if directory already exists
      if (yield* fs.exists(fullProjectPath)) {
        return yield* Effect.fail({
          error: "Project already exists at this path",
          success: false,
        });
      }

      // Create base directory structure
      yield* fs.makeDirectory(fullProjectPath, { recursive: true });
      yield* fs.makeDirectory(
        path.join(fullProjectPath, ASSETS_DIR, RelativeDir("recordings")),
        {
          recursive: true,
        },
      );

      const templateData = { name };

      // Copy and compile template files
      yield* copyTemplateDir(template.path, fullProjectPath, templateData);

      // Create shared files (project.json and .liqvid files)
      yield* compileTemplate(
        path.join(TEMPLATES_DIR, RelativeFile("project.json.hbs")),
        path.join(fullProjectPath, PROJECT_FILE),
        templateData,
      );

      // Generate .liqvid/project-meta.json (initial empty duration)
      yield* writeJSON<AutoGenProjectMeta>(
        path.join(fullProjectPath, ASSETS_DIR, PROJECT_META_FILE),
        { duration: { milliseconds: 0 } },
      );

      // Generate .liqvid/types.ts (initial structure)
      yield* compileTemplate(
        path.join(TEMPLATES_DIR, RelativeFile(`${TYPES_AUTOGEN}.hbs`)),
        path.join(fullProjectPath, ASSETS_DIR, TYPES_AUTOGEN),
        {
          directoryStructure: {
            [PROJECT_META_FILE]: null,
            recordings: {},
          },
        },
      );

      return { success: true };
    }).pipe(Effect.provide(NodeFileSystem.layer)),
  );

  return Exit.match(result, {
    onFailure: (e) => {
      console.error("Failed to create project:", e);

      return {
        error: e instanceof Error ? e.message : "Unknown error",
        success: false,
      };
    },
    onSuccess: (value) => value,
  });
}
