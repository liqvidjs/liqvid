"use server";

import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { NodeFileSystem } from "@effect/platform-node";
import { runNextBuild } from "@liqvid/cli/build";
import { writeJSON } from "@liqvid/cli/utils";
import type { AutoGenProjectMeta } from "@liqvid/schemas/effect";
import { serialize } from "@liqvid/ssr";
import { Effect, Exit, FileSystem, type PlatformError } from "effect";
import { execa } from "execa";
import Handlebars from "handlebars";

import {
  ASSETS_DIR,
  PROJECT_FILE,
  PROJECT_META_FILE,
} from "../conventions.mts";
import { getServerState } from "../initialize.mts";
import { readDirWithFileTypes } from "../utils/effect.mts";

export async function rebuildAction() {
  const result = await Effect.runPromise(
    runNextBuild().pipe(Effect.provide(NodeFileSystem.layer)),
  );
  return serialize(result);
}

export interface TemplateInfo {
  /** Unique identifier (directory name) */
  id: string;

  /** Display name from template.json */
  name: string;

  /** Whether this is the default template */
  default?: boolean;

  /** Full path to the template directory */
  path: string;
}

interface CreateProjectInput {
  name: string;
  projectPath: string;
  templateId: string;
}

interface CreateProjectResult {
  success: boolean;
  error?: string;
}

const TEMPLATES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "templates",
);

const PROJECT_TEMPLATES_DIR = path.join(TEMPLATES_DIR, "projects");

/**
 * Open project in Finder
 */
export async function openInFinderAction(
  projectPath: string,
): Promise<{ success: boolean }> {
  const { cwd } = getServerState();
  const APP_DIR = path.join(cwd, "app");

  try {
    // Validate path to prevent directory traversal
    if (projectPath.includes("..")) {
      return { success: false };
    }
    const fullPath = path.join(APP_DIR, projectPath);
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
  projectPath: string,
  renderId: string,
): Promise<{ success: boolean }> {
  const { cwd } = getServerState();
  const APP_DIR = path.join(cwd, "app");

  try {
    // Validate paths to prevent directory traversal
    if (projectPath.includes("..") || renderId.includes("..")) {
      return { success: false };
    }
    const fullPath = path.join(
      APP_DIR,
      projectPath,
      ASSETS_DIR,
      "renders",
      renderId,
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
  projectPath: string,
): Promise<{ success: boolean }> {
  const { cwd } = getServerState();
  const APP_DIR = path.join(cwd, "app");

  try {
    // Validate path to prevent directory traversal
    if (projectPath.includes("..")) {
      return { success: false };
    }
    const fullPath = path.join(APP_DIR, projectPath, ASSETS_DIR, "captions");
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
      const templateJsonPath = path.join(templateDir, "template.json");

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
  templatePath: string,
  outputPath: string,
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
  srcDir: string,
  destDir: string,
  data: Record<string, unknown>,
): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    yield* fs.makeDirectory(destDir, { recursive: true });

    const entries = yield* readDirWithFileTypes(srcDir);

    for (const [basename, stats] of entries) {
      const srcPath = path.join(srcDir, basename);
      const destName = basename.endsWith(".hbs")
        ? basename.slice(0, -4)
        : basename;
      const destPath = path.join(destDir, destName);

      if (basename === "template.json") {
        // Skip template.json
        continue;
      }

      if (stats.type === "Directory") {
        yield* copyTemplateDir(srcPath, destPath, data);
      } else if (basename.endsWith(".hbs")) {
        yield* compileTemplate(srcPath, destPath, data);
      } else {
        yield* fs.copyFile(srcPath, destPath);
      }
    }
  });
}

export async function createProjectAction(
  input: CreateProjectInput,
): Promise<CreateProjectResult> {
  const { cwd } = getServerState();
  const APP_DIR = path.join(cwd, "app");

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

      const fullProjectPath = path.join(APP_DIR, projectPath);

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
        path.join(fullProjectPath, ASSETS_DIR, "recordings"),
        {
          recursive: true,
        },
      );

      const templateData = { name };

      // Copy and compile template files
      yield* copyTemplateDir(template.path, fullProjectPath, templateData);

      // Create shared files (project.json and .liqvid files)
      yield* compileTemplate(
        path.join(TEMPLATES_DIR, "project.json.hbs"),
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
        path.join(TEMPLATES_DIR, "types.ts.hbs"),
        path.join(fullProjectPath, ASSETS_DIR, "types.ts"),
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
