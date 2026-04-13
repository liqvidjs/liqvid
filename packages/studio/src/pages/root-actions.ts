"use server";

import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { runNextBuild } from "@liqvid/cli/build";
import { execa } from "execa";
import Handlebars from "handlebars";

export async function rebuildAction(): Promise<{ success: boolean }> {
  try {
    await runNextBuild();
    return { success: true };
  } catch (e) {
    console.error("Failed to run next build:", e);
    return { success: false };
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

const APP_DIR = path.join(process.cwd(), "app");

/**
 * Open project in Finder
 */
export async function openInFinderAction(
  projectPath: string,
): Promise<{ success: boolean }> {
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
  try {
    // Validate paths to prevent directory traversal
    if (projectPath.includes("..") || renderId.includes("..")) {
      return { success: false };
    }
    const fullPath = path.join(
      APP_DIR,
      projectPath,
      ".liqvid",
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
async function compileTemplate(
  templatePath: string,
  outputPath: string,
  data: Record<string, unknown>,
): Promise<void> {
  const templateContent = await fsp.readFile(templatePath, "utf8");
  const template = Handlebars.compile(templateContent);
  const result = template(data);
  await fsp.writeFile(outputPath, result);
}

/**
 * Recursively copy and compile template files from source to destination.
 * Files ending in .hbs are compiled with Handlebars and have the .hbs extension removed.
 * Other files are copied as-is. template.json is skipped.
 */
async function copyTemplateDir(
  srcDir: string,
  destDir: string,
  data: Record<string, unknown>,
): Promise<void> {
  await fsp.mkdir(destDir, { recursive: true });

  const entries = await fsp.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destName = entry.name.endsWith(".hbs")
      ? entry.name.slice(0, -4)
      : entry.name;
    const destPath = path.join(destDir, destName);

    if (entry.name === "template.json") {
      // Skip template.json
      continue;
    }

    if (entry.isDirectory()) {
      await copyTemplateDir(srcPath, destPath, data);
    } else if (entry.name.endsWith(".hbs")) {
      await compileTemplate(srcPath, destPath, data);
    } else {
      await fsp.copyFile(srcPath, destPath);
    }
  }
}

export async function createProjectAction(
  input: CreateProjectInput,
): Promise<CreateProjectResult> {
  try {
    const { name, projectPath, templateId } = input;

    // Validate project path
    if (!projectPath || projectPath.includes("..")) {
      return { error: "Invalid project path", success: false };
    }

    // Validate and load template
    const templates = await loadTemplatesAction();
    const template = templates.find((t) => t.id === templateId);
    if (!template) {
      return { error: "Template not found", success: false };
    }

    const fullProjectPath = path.join(APP_DIR, projectPath);

    // Check if directory already exists
    try {
      await fsp.access(fullProjectPath);
      return { error: "Project already exists at this path", success: false };
    } catch {
      // Directory doesn't exist, which is what we want
    }

    // Create base directory structure
    await fsp.mkdir(fullProjectPath, { recursive: true });
    await fsp.mkdir(path.join(fullProjectPath, ".liqvid", "recordings"), {
      recursive: true,
    });

    const templateData = { name };

    // Copy and compile template files
    await copyTemplateDir(template.path, fullProjectPath, templateData);

    // Create shared files (project.json and .liqvid files)
    await compileTemplate(
      path.join(TEMPLATES_DIR, "project.json.hbs"),
      path.join(fullProjectPath, "project.json"),
      templateData,
    );

    // Generate .liqvid/project-meta.json (initial empty duration)
    await fsp.writeFile(
      path.join(fullProjectPath, ".liqvid", "project-meta.json"),
      JSON.stringify({ duration: { milliseconds: 0 } }, null, 2),
    );

    // Generate .liqvid/types.ts (initial structure)
    await compileTemplate(
      path.join(TEMPLATES_DIR, "types.ts.hbs"),
      path.join(fullProjectPath, ".liqvid", "types.ts"),
      {
        directoryStructure: {
          "project-meta.json": null,
          recordings: {},
        },
      },
    );

    return { success: true };
  } catch (e) {
    console.error("Failed to create project:", e);
    return {
      error: e instanceof Error ? e.message : "Unknown error",
      success: false,
    };
  }
}
