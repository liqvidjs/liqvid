import path from "node:path";

import { NodeFileSystem } from "@effect/platform-node";
import { Effect, FileSystem, Schedule, Schema } from "effect";
import { FetchHttpClient, HttpClient } from "effect/unstable/http";
import { RelativeFile } from "effect-paths";

import { getServerState } from "#_/initialize.mjs";

/** Packages we check for updates. */
const TRACKED_PACKAGES = ["liqvid", "@liqvid/studio"] as const;

/** How often to re-check npm for updates. */
const CHECK_INTERVAL = "1 hour";

/** npm registry base URL. */
const NPM_REGISTRY = "https://registry.npmjs.org";

/** Where in `package.json` a dependency's version range was declared. */
type DependencyField = "dependencies" | "devDependencies";

/**
 * Update information for a single tracked package.
 */
export interface PackageUpdate {
  /** Currently installed version (resolved from `node_modules`). */
  current: string;

  /**
   * Which `package.json` field the dependency lives in, so an update can be
   * written back to the correct place. `null` when {@link range} is `null`.
   */
  field: DependencyField | null;

  /** Latest version published to npm. */
  latest: string;
  /** Package name (e.g. `liqvid` or `@liqvid/studio`). */
  name: string;

  /**
   * The raw version range declared in `package.json` (e.g. `^1.2.3`), or
   * `null` when the dependency is not declared with a semver range (e.g. it
   * uses the `workspace:` protocol, a `file:`/`link:` specifier, or a git URL).
   * When `null`, the "click to update" CTA is not offered.
   */
  range: string | null;
}

/** Aggregate update state exposed to the UI. */
export interface UpdateInfo {
  /** Timestamp (`Date.now()`) of the last successful check. */
  checkedAt: number;

  /** Packages that have a newer version available. */
  updates: PackageUpdate[];
}

/** Schema for the relevant slice of a `package.json`. */
const PackageJson = Schema.Struct({
  dependencies: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  devDependencies: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});
type PackageJson = (typeof PackageJson)["Type"];

const decodePackageJson = Schema.decodeUnknownEffect(
  Schema.fromJsonString(PackageJson),
);

/** Schema for the fields we read out of an npm registry document. */
const NpmPackageDoc = Schema.Struct({
  version: Schema.optional(Schema.String),
});

/** A parsed semantic version (ignoring prerelease/build metadata ordering). */
interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  /** Prerelease identifiers, e.g. `["alpha", 6]` for `1.0.0-alpha.6`. */
  prerelease: (string | number)[];
}

/**
 * Parse a plain semver string. Returns `null` if it is not a clean
 * `x.y.z[-prerelease]` version (we do not attempt to parse ranges here).
 */
function parseVersion(version: string): ParsedVersion | null {
  const match =
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?(?:\+[0-9A-Za-z-.]+)?$/.exec(
      version.trim(),
    );
  if (!match) return null;

  const [, major, minor, patch, prerelease] = match;
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease: prerelease
      ? prerelease.split(".").map((id) => (/^\d+$/.test(id) ? Number(id) : id))
      : [],
  };
}

/**
 * Compare two parsed versions. Returns a negative number if `a < b`, positive
 * if `a > b`, and `0` if equal. Follows semver precedence: a version without a
 * prerelease outranks one with the same core version that has a prerelease.
 */
function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;

  // A version with no prerelease is greater than one with a prerelease.
  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0;
  if (a.prerelease.length === 0) return 1;
  if (b.prerelease.length === 0) return -1;

  const len = Math.max(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < len; i++) {
    const ai = a.prerelease[i];
    const bi = b.prerelease[i];
    if (ai === undefined) return -1;
    if (bi === undefined) return 1;
    if (ai === bi) continue;

    const aNum = typeof ai === "number";
    const bNum = typeof bi === "number";
    if (aNum && bNum) return (ai as number) - (bi as number);
    // Numeric identifiers have lower precedence than non-numeric ones.
    if (aNum) return -1;
    if (bNum) return 1;
    return String(ai) < String(bi) ? -1 : 1;
  }
  return 0;
}

/**
 * Determine whether `latest` is a newer version than `current`.
 */
export function isNewer(current: string, latest: string): boolean {
  const c = parseVersion(current);
  const l = parseVersion(latest);
  if (!c || !l) return false;
  return compareVersions(c, l) < 0;
}

/**
 * Whether a `package.json` version specifier is a semver range that we can
 * safely bump (as opposed to `workspace:`, `file:`, `link:`, `npm:`, or a git
 * URL). We accept the common range operators plus bare versions.
 */
function isSemverRange(spec: string): boolean {
  const trimmed = spec.trim();
  if (trimmed === "" || trimmed === "*" || trimmed === "latest") return false;
  // Reject anything using a protocol (workspace:, file:, link:, npm:, git+…).
  if (/^[a-z]+:/i.test(trimmed)) return false;
  if (trimmed.includes("/")) return false; // git shorthand like org/repo
  // Accept a leading range operator followed by something version-like.
  return /^[\^~>=<]*\s*\d/.test(trimmed) || /^\d/.test(trimmed);
}

/**
 * Locate a dependency's declared range within a `package.json`, returning both
 * the range string and which field it came from.
 */
function findDependency(
  pkg: PackageJson,
  name: string,
): { field: DependencyField; range: string } | null {
  if (pkg.dependencies && name in pkg.dependencies) {
    return { field: "dependencies", range: pkg.dependencies[name]! };
  }
  if (pkg.devDependencies && name in pkg.devDependencies) {
    return { field: "devDependencies", range: pkg.devDependencies[name]! };
  }
  return null;
}

/**
 * Read the installed version of a package from its `node_modules` entry.
 * Yields `null` on any failure (missing package, unreadable/invalid JSON).
 */
function getInstalledVersion(cwd: string, name: string) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const pkgJsonPath = path.join(
      cwd,
      "node_modules",
      ...name.split("/"),
      "package.json",
    );
    const contents = yield* fs.readFileString(pkgJsonPath, "utf8");
    const doc = yield* Schema.decodeUnknownEffect(
      Schema.fromJsonString(NpmPackageDoc),
    )(contents);
    return doc.version ?? null;
  }).pipe(Effect.orElseSucceed(() => null));
}

/**
 * Query the npm registry for the latest published version of a package.
 * Yields `null` on any failure (offline, non-2xx, invalid JSON).
 */
function getLatestVersion(name: string) {
  return Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const url = `${NPM_REGISTRY}/${encodeURIComponent(name).replace("%40", "@")}/latest`;

    const response = yield* client.get(url, {
      headers: { accept: "application/json" },
    });
    if (response.status < 200 || response.status >= 300) {
      return null;
    }

    const body = yield* response.json;
    const doc = yield* Schema.decodeUnknownEffect(NpmPackageDoc)(body);
    return doc.version ?? null;
  }).pipe(Effect.orElseSucceed(() => null));
}

/**
 * Check npm for newer versions of the tracked Liqvid packages and update the
 * server state. Never fails — errors (offline, registry errors, missing
 * `package.json`) leave the previous {@link UpdateInfo} untouched.
 */
export function checkForUpdates() {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const state = getServerState();
    const { cwd } = state;

    const contents = yield* fs.readFileString(
      path.join(cwd, RelativeFile("package.json")),
      "utf8",
    );
    const pkg = yield* decodePackageJson(contents);

    const results = yield* Effect.forEach(
      TRACKED_PACKAGES,
      (name) =>
        Effect.gen(function* () {
          const [installed, latest] = yield* Effect.all(
            [getInstalledVersion(cwd, name), getLatestVersion(name)],
            { concurrency: "unbounded" },
          );

          if (!installed || !latest) return null;
          if (!isNewer(installed, latest)) return null;

          const declared = findDependency(pkg, name);
          const usesRange = declared !== null && isSemverRange(declared.range);

          const update: PackageUpdate = {
            current: installed,
            field: usesRange ? declared.field : null,
            latest,
            name,
            range: usesRange ? declared.range : null,
          };
          return update;
        }),
      { concurrency: "unbounded" },
    );

    // `TRACKED_PACKAGES` order is preserved by `Effect.forEach`, so filtering
    // keeps updates in declaration order (liqvid, then @liqvid/studio).
    const updates = results.filter((u): u is PackageUpdate => u !== null);

    state.updateInfo = { checkedAt: Date.now(), updates };
  }).pipe(
    // A failure here (e.g. no readable package.json) is non-fatal: keep the
    // previous state untouched and log for diagnostics.
    Effect.catchCause((cause) => Effect.logError("Update check failed", cause)),
  );
}

/**
 * Start the update checker: run once immediately, then re-check every hour.
 * The returned promise resolves once the initial check completes.
 */
export async function watchForUpdates(): Promise<void> {
  const check = checkForUpdates().pipe(
    Effect.provide(NodeFileSystem.layer),
    Effect.provide(FetchHttpClient.layer),
  );

  // Run the first check and await it, so callers can rely on `updateInfo`
  // being populated once this resolves.
  await Effect.runPromise(check);

  // Re-check on a fixed cadence in a detached fiber. `Schedule.spaced` waits
  // the interval *between* runs, so the next check happens an hour from now.
  Effect.runFork(Effect.repeat(check, Schedule.spaced(CHECK_INTERVAL)));
}
