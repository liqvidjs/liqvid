"use server";

import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { NodeFileSystem } from "@effect/platform-node";
import { runNextBuild } from "@liqvid/cli/build";
import { publishContent, publishMedia } from "@liqvid/cli/publish";
import { UP, writeJSON } from "@liqvid/cli/utils";
import type { AutoGenProjectMeta } from "@liqvid/schemas";
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
  PROJECT_PATH,
  SCREENSHOTS_DIR,
  TEMPLATE_FILE,
  TYPES_AUTOGEN,
} from "#_/conventions.mjs";
import { getServerState } from "#_/initialize.mjs";
import type { PackageName } from "#_/types/misc.mjs";
import { readDirWithFileTypes } from "#_/utils/effect.mjs";
import { createJob } from "#_/utils/jobs.mjs";
import { getRoutesDir } from "#_/utils/misc.mjs";

export interface RebuildActionResult {
  /** ID of the created job, so the client can link to it. */
  jobId: string;
}

/**
 * Kick off a project rebuild as a background job. The build's stdout and stderr
 * are captured into the job's logs (viewable on the jobs page) rather than run
 * inline. Returns the id of the created job.
 */
export async function rebuildAction(): Promise<RebuildActionResult> {
  const { cwd } = getServerState();

  // The build effect that the job runs. On success, record the build time so
  // the UI can offer "Publish" within the publish window.
  const buildEffect = runNextBuild({ cwd }).pipe(
    Effect.tap(() =>
      Effect.sync(() => {
        getServerState().lastBuildTime = Date.now();
      }),
    ),
  );

  // `createJob` registers the job and broadcasts a `newJob` message, and it
  // broadcasts `updateJob` as the job completes/fails, so the jobs page (and
  // the rebuild button) can react over WebSockets.
  const job = await Effect.runPromise(
    createJob("rebuild", buildEffect).pipe(
      Effect.provide(NodeFileSystem.layer),
    ),
  );

  return { jobId: job.id };
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
  /** Whether this is the default template */
  default?: boolean;
  /** Unique identifier (directory name) */
  id: string;

  /** Display name from template.json */
  name: string;

  /** Full path to the template directory */
  path: AbsoluteDir;
}

interface CreateProjectInput {
  name: string;
  projectPath: RelativeDir;
  templateId: string;
}

interface CreateProjectResult {
  error?: string;
  success: boolean;
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
 * Open a screenshot folder in Finder
 */
export async function openScreenshotInFinderAction(
  projectPath: RelativeDir,
  screenshotId: string,
): Promise<{ success: boolean }> {
  try {
    // Validate paths to prevent directory traversal
    if (projectPath.includes("..") || screenshotId.includes("..")) {
      return { success: false };
    }
    const fullPath = path.join(
      getRoutesDir(),
      projectPath,
      ASSETS_DIR,
      SCREENSHOTS_DIR,
      RelativeDir(screenshotId),
    );
    await execa("open", [fullPath]);
    return { success: true };
  } catch (e) {
    console.error("Failed to open screenshot in Finder:", e);
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
const compileTemplate = Effect.fnUntraced(function* (
  templatePath: AbsoluteFile,
  outputPath: AbsoluteFile,
  data: Record<string, unknown>,
) {
  const fs = yield* FileSystem.FileSystem;
  const templateContent = yield* fs.readFileString(templatePath);
  const template = Handlebars.compile(templateContent);
  const result = template(data);
  yield* fs.writeFileString(outputPath, result);
});

/**
 * Recursively copy and compile template files from source to destination.
 * Files ending in .hbs are compiled with Handlebars and have the .hbs extension removed.
 * Other files are copied as-is. template.json is skipped.
 */
const copyTemplateDir = Effect.fnUntraced(function* (
  srcDir: AbsoluteDir,
  destDir: AbsoluteDir,
  data: Record<string, unknown>,
): Generator<
  Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem>
> {
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

interface UpdatePackageResult {
  error?: string;
  success: boolean;
}

/**
 * Bump a tracked package's version range in the user's `package.json` to the
 * latest available version, preserving the existing range operator (e.g.
 * `^1.0.0` -> `^1.1.0`). Only packages declared with a semver range are
 * eligible; `workspace:` and other protocol specifiers are rejected.
 */
export async function updatePackageAction(
  name: PackageName,
): Promise<UpdatePackageResult> {
  const { cwd, updateInfo } = getServerState();

  const update = updateInfo?.updates.find((u) => u.name === name);
  if (!update) {
    return { error: "No update available for this package", success: false };
  }
  if (update.range === null || update.field === null) {
    return {
      error: "This dependency cannot be updated automatically",
      success: false,
    };
  }

  // Preserve the leading range operator (^, ~, >=, etc.) from the existing
  // specifier, defaulting to a caret range.
  const operatorMatch = /^[\^~>=<\s]*/.exec(update.range);
  const operator = (operatorMatch?.[0] ?? "").replace(/\s+/g, "") || "^";
  const nextRange = `${operator}${update.latest}`;

  try {
    const packageJsonPath = path.join(cwd, RelativeFile("package.json"));
    const contents = await fsp.readFile(packageJsonPath, "utf8");
    const pkg = JSON.parse(contents) as Record<
      string,
      Record<string, string> | unknown
    >;

    const field = pkg[update.field];
    if (typeof field !== "object" || field === null) {
      return { error: "Dependency field not found", success: false };
    }
    (field as Record<string, string>)[name] = nextRange;

    // Preserve trailing newline if present.
    const trailingNewline = contents.endsWith("\n") ? "\n" : "";
    await fsp.writeFile(
      packageJsonPath,
      `${JSON.stringify(pkg, null, 2)}${trailingNewline}`,
    );

    return { success: true };
  } catch (e) {
    console.error("Failed to update package.json:", e);
    return {
      error: e instanceof Error ? e.message : "Unknown error",
      success: false,
    };
  }
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

      // Generate .liqvid/project-path.json
      yield* writeJSON<string>(
        path.join(fullProjectPath, ASSETS_DIR, PROJECT_PATH),
        projectPath,
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
