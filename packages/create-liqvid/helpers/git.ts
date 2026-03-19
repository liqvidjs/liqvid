import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";

function isInGitRepository(): boolean {
  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
    return true;
  } catch (_) {}
  return false;
}

function isInMercurialRepository(): boolean {
  try {
    execSync("hg --cwd . root", { stdio: "ignore" });
    return true;
  } catch (_) {}
  return false;
}

function isDefaultBranchSet(): boolean {
  try {
    execSync("git config init.defaultBranch", { stdio: "ignore" });
    return true;
  } catch (_) {}
  return false;
}

export function tryGitInit(root: string): boolean {
  let didInit = false;
  try {
    execSync("git --version", { stdio: "ignore" });
    if (isInGitRepository() || isInMercurialRepository()) {
      return false;
    }

    execSync("git init", { stdio: "ignore" });
    didInit = true;

    if (!isDefaultBranchSet()) {
      execSync("git checkout -b main", { stdio: "ignore" });
    }

    execSync("git add -A", { stdio: "ignore" });
    execSync('git commit -m "Initial commit from Create Next App"', {
      stdio: "ignore",
    });
    return true;
  } catch (_e) {
    if (didInit) {
      try {
        rmSync(join(root, ".git"), { force: true, recursive: true });
      } catch (_) {}
    }
    return false;
  }
}
