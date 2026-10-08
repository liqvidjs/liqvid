import * as path from "node:path";

import { NodeHttpClient, NodeStream } from "@effect/platform-node";
import { checkbox, confirm } from "@inquirer/prompts";
import { Duration as LiqvidDuration } from "@liqvid/duration";
import { Progress } from "@liqvid/renderer";
import {
  AutoGenProjectMeta,
  LiqvidStudioProjectMeta,
  type ParameterConfig,
  type ParameterValues,
  type ParametrizedValueEntry,
  type ProjectId,
  ProjectJson,
  type ProviderConfigLiqvidStudio,
  type WorkspaceId,
  WorkspaceMeta,
} from "@liqvid/schemas";
import {
  LiqvidStudioPublicApi,
  type ProjectRequest,
} from "@liqvid/studio-public-api";
import {
  Cause,
  Duration,
  Effect,
  FileSystem,
  Layer,
  Option,
  type PlatformError,
  Redacted,
  Result,
  Schema,
  Stream,
} from "effect";
import { HttpClient, HttpClientRequest } from "effect/http";
import * as HttpClientError from "effect/http/HttpClientError";
import { HttpApiClient } from "effect/http-api";
import {
  type AbsoluteDir,
  type AbsoluteFile,
  RelativeDir,
  RelativeFile,
} from "effect-paths";
import { Agent, fetch, type RequestInit as StudioRequestInit } from "undici";

import { PACKAGE_JSON } from "#_/conventions";
import { loadJson, readDirWithFileTypes } from "#_/utils";
import { resolveParametrized } from "#_/utils/parametrization";

import type {
  FileDownloadStatus,
  FileUploadStatus,
  HostingProvider,
  MediaHostingProvider,
  ProgressService,
  RemoteFileInfo,
} from "../types.mts";

const API_URL = "https://studio.localhost";
const API_BATCH_SIZE = 1000;
const CHECK_CONCURRENCY = 50;
const UPLOAD_CONCURRENCY = 5;

const CONTENT_DOMAIN =
  process.env.LIQVID_STUDIO_CUSTOM_CONTENT_DOMAIN ?? "liqvidstudio.com";

const SCHEMAS = "https://liqvidjs.org/schemas/latest";
const STUDIO_META_SCHEMA = `${SCHEMAS}/liqvid-studio-project-meta.json`;
const WORKSPACE_META_SCHEMA = `${SCHEMAS}/liqvid-studio-workspace-meta.json`;

const PROJECT_FILE = RelativeFile("project.json");
const PROJECT_META_FILE = RelativeFile("project-meta.json");

const LIQVID_DIR = RelativeDir(".liqvid");

const PROJECT_STUDIO_META = RelativeFile(".liqvid-studio.json");
const WORKSPACE_META = RelativeFile(".liqvid-studio.json");

class LiqvidStudioError extends Schema.TaggedError<LiqvidStudioError>()(
  "LiqvidStudioError",
  {
    cause: Schema.Defect().pipe(Schema.optional),
    message: Schema.String,
  },
) {}

function logClientError(cause: Cause.Cause<unknown>) {
  const $error = Cause.findError(cause);
  if (Result.isFailure($error)) {
    return Effect.void;
  }
  const error = $error.success;
  const stack = Cause.pretty(cause);
  const fullStack = stack.includes("\n    at ")
    ? stack
    : `${stack}\n${new Error().stack?.split("\n").slice(1).join("\n") ?? ""}`;

  if (!HttpClientError.isHttpClientError(error)) {
    return Effect.logError("Liqvid Studio API request failed", fullStack);
  }

  const { request, response, reason } = error;
  const requestInfo = `${request.method} ${request.url}`;
  if (!response) {
    return Effect.logError(
      `Liqvid Studio API request failed (${requestInfo}, ${reason._tag})`,
      fullStack,
    );
  }

  return response.text.pipe(
    Effect.flatMap((body) =>
      Effect.logError(
        `Liqvid Studio API request failed (${requestInfo}, status ${response.status}, ${reason._tag}): ${body || "<empty body>"}`,
        fullStack,
      ),
    ),
    Effect.catch(() =>
      Effect.logError(
        `Liqvid Studio API request failed (${requestInfo}, status ${response.status}, ${reason._tag}; response body unavailable)`,
        fullStack,
      ),
    ),
  );
}

function makeClient(accessToken: Redacted.Redacted<string>, dispatcher: Agent) {
  const httpClientLayer = NodeHttpClient.layerUndiciNoDispatcher.pipe(
    Layer.provide(Layer.succeed(NodeHttpClient.Dispatcher, dispatcher)),
  );
  return Effect.runSync(
    HttpApiClient.make(LiqvidStudioPublicApi, {
      baseUrl: API_URL,
      transformClient: (client) =>
        client.pipe(
          HttpClient.mapRequest(
            HttpClientRequest.bearerToken(Redacted.value(accessToken)),
          ),
        ),
      transformResponse: (effect) =>
        effect.pipe(Effect.tapCause(logClientError)),
    }).pipe(Effect.provide(httpClientLayer)),
  );
}

/** Hosting provider backed by Liqvid Studio's signed R2 upload API. */
export class LiqvidStudioProvider
  implements HostingProvider, MediaHostingProvider
{
  readonly #config: ProviderConfigLiqvidStudio;
  readonly #deleteStale: boolean;
  readonly #dispatcher: Agent;
  readonly #client: ReturnType<typeof makeClient>;
  #workspaceName: string | undefined;

  constructor(config: ProviderConfigLiqvidStudio, deleteStale = false) {
    this.#config = config;
    this.#deleteStale = deleteStale;
    this.#dispatcher = new Agent({
      bodyTimeout: Duration.toMillis(Duration.seconds(30)),
      connect: {
        rejectUnauthorized:
          process.env.LIQVID_STUDIO_ALLOW_SELF_SIGNED !== "true",
        timeout: Duration.toMillis(Duration.seconds(30)),
      },
      headersTimeout: Duration.toMillis(Duration.seconds(30)),
    });
    this.#client = makeClient(this.#config.accessToken, this.#dispatcher);
  }

  checkFiles(
    files: readonly AbsoluteFile[],
    rootDir: AbsoluteDir,
  ): Effect.Effect<FileUploadStatus[], unknown, FileSystem.FileSystem> {
    return Effect.gen({ self: this }, function* (this: LiqvidStudioProvider) {
      const remoteFiles = yield* this.listRemoteFiles();
      const remoteByKey = new Map(remoteFiles.map((file) => [file.key, file]));
      const fs = yield* FileSystem.FileSystem;

      return yield* Effect.all(
        files.map((filePath) =>
          Effect.gen({ self: this }, function* () {
            const key = this.#relativeKey(path.relative(rootDir, filePath));
            const remote = remoteByKey.get(key);
            if (!remote) {
              return {
                filePath,
                key,
                needsUpload: true,
                reason: "new" as const,
              };
            }

            const localStats = yield* fs.stat(filePath);
            const localSize = Number(localStats.size);
            const localMtime = localStats.mtime.pipe(
              Option.getOrElse(() => new Date()),
            );
            const needsUpload =
              localSize !== remote.size || localMtime > remote.lastModified;

            return {
              filePath,
              key,
              needsUpload,
              reason: needsUpload
                ? ("modified" as const)
                : ("unchanged" as const),
            };
          }),
        ),
        { concurrency: CHECK_CONCURRENCY },
      );
    });
  }

  checkRemoteFiles(
    remoteFiles: readonly RemoteFileInfo[],
    rootDir: AbsoluteDir,
  ): Effect.Effect<FileDownloadStatus[]> {
    return Effect.succeed(
      remoteFiles.map((remoteFile) => ({
        key: remoteFile.key,
        localPath: path.join(rootDir, remoteFile.key) as AbsoluteFile,
        needsDownload: true,
        reason: "new" as const,
      })),
    );
  }

  downloadMedia(_files: readonly FileDownloadStatus[]): Effect.Effect<number> {
    return Effect.die(
      new LiqvidStudioError({
        message: "Liqvid Studio does not support downloads",
      }),
    );
  }

  getContentBaseUrl() {
    return Effect.gen({ self: this }, function* () {
      const { workspaceId } = yield* this.#getWorkspaceMeta();
      return `/${workspaceId}`;
    });
  }

  getMediaBaseUrl() {
    return Effect.gen({ self: this }, function* () {
      const { userId, workspaceId } = yield* this.#getWorkspaceMeta();
      return `https://${userId}.${CONTENT_DOMAIN}/${workspaceId}`;
    });
  }

  listRemoteFiles() {
    return Effect.gen({ self: this }, function* () {
      const { workspaceId } = yield* this.#getWorkspaceMeta();
      const prefix = `${workspaceId}/`;
      const files: RemoteFileInfo[] = [];
      let cursor: string | undefined;

      while (true) {
        const body = yield* this.#client.files
          .list({
            query: {
              limit: String(API_BATCH_SIZE),
              prefix: prefix,
              ...(cursor === undefined ? {} : { cursor }),
            },
          })
          .pipe(Effect.orDie);

        for (const file of body.files) {
          if (!file.key.startsWith(prefix)) continue;
          files.push({
            key: file.key.slice(prefix.length) as RelativeFile,
            lastModified: new Date(file.lastModified),
            size: file.size,
          });
        }
        cursor = body.truncated ? (body.nextCursor ?? undefined) : undefined;
        if (!cursor) break;
      }

      return files;
    }).pipe(Effect.orDie);
  }

  publishContent(
    localDir: AbsoluteDir,
    force = false,
    projectDir: AbsoluteDir = localDir,
  ) {
    return this.#publishDirectory(localDir, force, projectDir);
  }

  publishMedia(
    files: readonly AbsoluteFile[],
    rootDir: AbsoluteDir,
    force = false,
  ) {
    return Effect.gen({ self: this }, function* () {
      const { workspaceId } = yield* this.#getWorkspaceMeta().pipe(
        Effect.orDie,
      );
      return yield* this.#publishFiles(
        files.map((file) => [
          file,
          path.relative(rootDir, file) as RelativeFile,
        ]),
        workspaceId,
        force,
      );
    });
  }

  #publishDirectory(
    localDir: AbsoluteDir,
    force: boolean,
    projectDir: AbsoluteDir,
  ): Effect.Effect<
    void,
    PlatformError.PlatformError,
    FileSystem.FileSystem | ProgressService
  > {
    return Effect.gen({ self: this }, function* (this: LiqvidStudioProvider) {
      let i = 0;
      const files = yield* this.#listFiles(localDir);

      const projectFiles =
        projectDir === localDir ? files : yield* this.#listFiles(projectDir);

      const { workspaceId } = yield* this.#getWorkspaceMeta().pipe(
        Effect.orDie,
      );

      yield* this.#syncProjects(projectDir, projectFiles, workspaceId).pipe(
        Effect.orDie,
      );

      yield* this.#publishFiles(
        files.map((file) => [
          file,
          path.relative(localDir, file) as RelativeFile,
        ]),
        workspaceId,
        force,
      );

      yield* Effect.logInfo(i++);
    });
  }

  #getWorkspaceMeta() {
    return Effect.gen({ self: this }, function* (this: LiqvidStudioProvider) {
      const metaFile = path.join(process.cwd(), LIQVID_DIR, WORKSPACE_META);
      const existingMeta = yield* this.#readWorkspaceMeta(metaFile);
      if (Option.isSome(existingMeta)) return existingMeta.value;

      const fs = yield* FileSystem.FileSystem;

      const response = yield* this.#client.workspaces
        .create({ payload: { name: yield* this.#getWorkspaceName() } })
        .pipe(Effect.orDie);
      const userId = yield* this.#client.identity.get().pipe(
        Effect.orDie,
        Effect.map(({ userId }) => userId),
      );

      yield* fs.makeDirectory(path.dirname(metaFile), { recursive: true });
      yield* fs.writeFileString(
        metaFile,
        `${JSON.stringify({ $schema: WORKSPACE_META_SCHEMA, userId, workspaceId: response.workspaceId }, null, 2)}\n`,
      );

      return { userId, workspaceId: response.workspaceId };
    });
  }

  #syncProjects(
    localDir: AbsoluteDir,
    files: readonly AbsoluteFile[],
    workspaceId: WorkspaceId,
  ) {
    return Effect.gen({ self: this }, function* () {
      const projectFiles = files.filter(
        (file) => path.basename(file) === PROJECT_FILE,
      );

      const projectData = yield* Effect.all(
        projectFiles.map((projectFile) =>
          Effect.gen({ self: this }, function* () {
            const project = yield* loadJson(ProjectJson, projectFile).pipe(
              Effect.tapCause((cause) =>
                Effect.logError(
                  `Failed to load ${PROJECT_FILE} at ${projectFile}`,
                  Cause.pretty(cause),
                ),
              ),
            );
            const projectDir = path.dirname(projectFile) as AbsoluteDir;
            const metaFile = path.join(
              projectDir,
              LIQVID_DIR,
              PROJECT_STUDIO_META,
            );
            const projectPath = path
              .relative(localDir, projectDir)
              .replaceAll(path.sep, "/");
            const combinations = project.parameters
              ? cartesianProduct(project.parameters)
              : [];
            return {
              existingIds: yield* this.#readProjectIds(metaFile),
              metaFile,
              parameterized: combinations.length > 0,
              parameterSets: (combinations.length > 0
                ? combinations
                : [{}]) as ParameterValues[],
              project,
              projectDir,
              projectPath,
            };
          }),
        ),
        { concurrency: UPLOAD_CONCURRENCY },
      );

      const drafts = projectData.flatMap((data) =>
        data.parameterSets.flatMap((parameters) => {
          const projectId = findProjectId(data.existingIds, parameters);
          if (
            !projectId ||
            !resolveParametrized(data.project.draft, parameters)
          ) {
            return [];
          }
          const parameterText = Object.entries(parameters)
            .map(([key, value]) => `${key}=${value}`)
            .join(", ");
          return [
            {
              id: projectId,
              label: `${data.projectPath}/project.json${parameterText ? ` (${parameterText})` : ""}`,
            },
          ];
        }),
      );
      const toUnpublish = drafts.length
        ? yield* Effect.promise(() => selectProjectsToUnpublish(drafts))
        : new Set<ProjectId>();

      if (drafts.length > 0 && toUnpublish.size === 0) {
        return yield* Effect.die(
          new LiqvidStudioError({ message: "Publishing cancelled" }),
        );
      }

      yield* Effect.all(
        projectData.map((data) =>
          Effect.gen({ self: this }, function* () {
            const fs = yield* FileSystem.FileSystem;
            const projectIds: ParametrizedValueEntry<ProjectId>[] = [];

            for (const parameters of data.parameterSets) {
              const existingId = findProjectId(data.existingIds, parameters);
              const isDraft = resolveParametrized(
                data.project.draft,
                parameters,
              );
              if (isDraft) {
                if (existingId && toUnpublish.has(existingId)) {
                  yield* this.#client.projects
                    .delete({
                      params: { projectId: existingId },
                    })
                    .pipe(Effect.orDie);
                } else if (existingId) {
                  projectIds.push({ ...parameters, value: existingId });
                }
                continue;
              }

              const projectMetaPath = path.join(
                String(data.projectDir),
                String(LIQVID_DIR),
                ...Object.values(parameters),
                String(PROJECT_META_FILE),
              ) as AbsoluteFile;
              const projectMeta = yield* loadJson(
                AutoGenProjectMeta,
                projectMetaPath,
              );

              const request: ProjectRequest = {
                aspectRatio: data.project.aspectRatio,
                description: resolveParametrized(
                  data.project.description,
                  parameters,
                ),
                duration:
                  LiqvidDuration.inMilliseconds(projectMeta.duration) / 1000,
                name:
                  resolveParametrized(data.project.title, parameters) ??
                  (() => {
                    throw new LiqvidStudioError({
                      message: `Missing title for ${data.projectPath} with parameters ${JSON.stringify(parameters)}`,
                    });
                  })(),
                parameters: data.parameterized
                  ? Object.fromEntries(
                      Object.entries(parameters).map(([key, value]) => [
                        key,
                        [value],
                      ]),
                    )
                  : data.project.parameters,
                path: data.projectPath,
                workspaceId,
              };
              const response = yield* (
                existingId
                  ? this.#client.projects.sync({
                      params: { projectId: existingId },
                      payload: request,
                    })
                  : this.#client.projects.create({ payload: request })
              ).pipe(Effect.orDie);
              projectIds.push({ ...parameters, value: response.projectId });
            }

            if (projectIds.length === 0) {
              if (data.existingIds.length > 0) {
                yield* fs.remove(data.metaFile);
              }
              return;
            }
            yield* fs.makeDirectory(path.dirname(data.metaFile), {
              recursive: true,
            });
            yield* fs.writeFileString(
              data.metaFile,
              `${JSON.stringify(
                {
                  $schema: STUDIO_META_SCHEMA,
                  projectId: data.parameterized
                    ? projectIds
                    : projectIds[0]!.value,
                },
                null,
                2,
              )}\n`,
            );
          }),
        ),
        { concurrency: UPLOAD_CONCURRENCY },
      );
    });
  }

  #readProjectIds(metaFile: AbsoluteFile) {
    return loadJson(LiqvidStudioProjectMeta, metaFile).pipe(
      Effect.map((meta) =>
        Array.isArray(meta.projectId)
          ? meta.projectId
          : [{ value: meta.projectId }],
      ),
      Effect.orElseSucceed(() => []),
    );
  }

  #readWorkspaceMeta(metaFile: AbsoluteFile) {
    return loadJson(WorkspaceMeta, metaFile).pipe(Effect.option);
  }

  #publishFiles(
    files: readonly [AbsoluteFile, RelativeFile][],
    workspaceId: WorkspaceId,
    force = false,
  ) {
    return Effect.gen({ self: this }, function* () {
      const fs = yield* FileSystem.FileSystem;
      const remoteFiles = yield* this.listRemoteFiles();
      const remoteByKey = new Map(remoteFiles.map((file) => [file.key, file]));
      const uploads: Array<{
        filePath: AbsoluteFile;
        key: string;
        size: number;
      }> = [];
      const desiredKeys = new Set<string>();

      for (const [filePath, relativePath] of files) {
        const key = this.#relativeKey(relativePath);
        desiredKeys.add(key);
        const stats = yield* fs.stat(filePath);
        const mtime = stats.mtime.pipe(Option.getOrElse(() => new Date()));
        const remote = remoteByKey.get(key);
        if (
          force ||
          !remote ||
          remote.size !== Number(stats.size) ||
          mtime > remote.lastModified
        ) {
          uploads.push({ filePath, key, size: Number(stats.size) });
        }
      }

      const totalBytes = uploads.reduce(
        (total, upload) => total + upload.size,
        0,
      );
      const { SingleBar } = yield* Progress;
      const progress =
        totalBytes > 0
          ? new SingleBar({ formatValue: formatBytes })
          : undefined;
      progress?.start(totalBytes, 0);

      yield* Effect.gen({ self: this }, function* () {
        for (const batch of this.#batches(uploads.map(({ key }) => key))) {
          const body = yield* this.#client.files
            .upload({ payload: { keys: batch, workspaceId } })
            .pipe(Effect.orDie);
          const byKey = new Map(
            body.uploads.map((upload) => [upload.key, upload]),
          );
          yield* Effect.all(
            uploads
              .filter(({ key }) => batch.includes(key))
              .map(({ filePath, key, size }) =>
                Effect.gen({ self: this }, function* () {
                  const upload = byKey.get(key);
                  if (!upload) {
                    return yield* Effect.die(
                      new LiqvidStudioError({
                        message: `Studio did not return an upload URL for ${key}`,
                      }),
                    );
                  }
                  let countedBytes = 0;
                  const response = yield* Effect.gen(
                    { self: this },
                    function* () {
                      // Build a fresh body for each retry; streams are single-use.
                      const stream = yield* NodeStream.toReadable(
                        fs.stream(filePath).pipe(
                          Stream.tap((chunk) =>
                            Effect.sync(() => {
                              const bytesToCount = Math.min(
                                chunk.length,
                                size - countedBytes,
                              );
                              countedBytes += bytesToCount;
                              progress?.increment(bytesToCount);
                            }),
                          ),
                        ),
                      );

                      return yield* Effect.tryPromise({
                        catch: (cause) =>
                          new LiqvidStudioError({
                            cause,
                            message: `Upload request failed for ${key}`,
                          }),
                        try: () =>
                          fetch(upload.url, {
                            body: stream,
                            dispatcher: this.#dispatcher,
                            duplex: "half",
                            headers: {
                              "content-length": String(size),
                              "content-type": this.#contentType(filePath),
                            },
                            method: "PUT",
                          } as StudioRequestInit),
                      });
                    },
                  ).pipe(Effect.retry({ times: 2 }), Effect.orDie);
                  if (!response.ok) {
                    const resText = yield* Effect.promise(() =>
                      response.text(),
                    );
                    return yield* Effect.die(
                      new LiqvidStudioError({
                        message: `Upload failed for ${key}: ${response.status} ${response.statusText}\n${resText}`,
                      }),
                    );
                  }
                }),
              ),
            { concurrency: UPLOAD_CONCURRENCY },
          );
        }
      }).pipe(Effect.ensuring(Effect.sync(() => progress?.stop())));

      if (this.#deleteStale) {
        const stale = remoteFiles
          .map(({ key }) => key)
          .filter((key) => !desiredKeys.has(key));
        for (const batch of this.#batches(stale)) {
          yield* this.#client.files
            .delete({ payload: { keys: batch } })
            .pipe(Effect.orDie);
        }
      }
    });
  }

  #listFiles(
    directory: AbsoluteDir,
  ): Effect.Effect<
    AbsoluteFile[],
    PlatformError.PlatformError,
    FileSystem.FileSystem
  > {
    return Effect.gen({ self: this }, function* (this: LiqvidStudioProvider) {
      const files: AbsoluteFile[] = [];
      for (const [name, kind] of yield* readDirWithFileTypes(directory)) {
        if (kind === "Directory") {
          const entryPath = path.join(directory, name);
          files.push(...(yield* this.#listFiles(entryPath)));
        } else if (kind === "File") {
          const entryPath = path.join(directory, name);
          files.push(entryPath);
        }
      }
      return files;
    });
  }

  #getWorkspaceName() {
    return Effect.gen({ self: this }, function* () {
      if (this.#workspaceName) return this.#workspaceName;
      if (this.#config.workspace) {
        this.#workspaceName = this.#config.workspace;
        return this.#workspaceName;
      }

      const PackageJson = Schema.Struct({
        name: Schema.String,
      });

      const packagePath = path.join(process.cwd(), PACKAGE_JSON);

      const packageJson = yield* loadJson(PackageJson, packagePath).pipe(
        Effect.mapError(
          (cause) =>
            new LiqvidStudioError({
              cause,
              message: `Could not read ${packagePath} to determine the project`,
            }),
        ),
      );

      const packageName = packageJson.name;

      if (packageName.includes("/")) {
        yield* new LiqvidStudioError({
          message:
            "Liqvid Studio project is required when package.json name contains a slash",
        });
      }

      this.#workspaceName = packageName;
      return packageName;
    });
  }

  #relativeKey(relativePath: RelativeFile): RelativeFile {
    return relativePath.replaceAll(path.sep, "/") as RelativeFile;
  }

  *#batches<T>(items: readonly T[]): Generator<T[]> {
    for (let index = 0; index < items.length; index += API_BATCH_SIZE) {
      yield items.slice(index, index + API_BATCH_SIZE);
    }
  }

  #contentType(filePath: string): string {
    const types: Record<string, string> = {
      ".css": "text/css",
      ".gif": "image/gif",
      ".html": "text/html",
      ".jpeg": "image/jpeg",
      ".jpg": "image/jpeg",
      ".js": "application/javascript",
      ".json": "application/json",
      ".mjs": "application/javascript",
      ".mp4": "video/mp4",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".vtt": "text/vtt",
      ".webm": "video/webm",
    };
    return (
      types[path.extname(filePath).toLowerCase()] ?? "application/octet-stream"
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function cartesianProduct<T extends ParameterConfig>(
  parameters: T,
): Array<{ [K in keyof T]: T[K][number] }> {
  const keys = Object.keys(parameters) as (keyof T)[];

  return keys.reduce<Record<string, string>[]>(
    (combinations, key) =>
      combinations.flatMap((combination) =>
        parameters[key]!.map((value) => ({ ...combination, [key]: value })),
      ),
    [{}],
  ) as Array<{ [K in keyof T]: T[K][number] }>;
}

function findProjectId(
  projectIds: ParametrizedValueEntry<ProjectId>[],
  parameters: ParameterValues,
): ProjectId | undefined {
  return projectIds.find((entry) =>
    Object.entries(entry).every(
      ([key, value]) => key === "value" || parameters[key] === value,
    ),
  )?.value;
}

async function selectProjectsToUnpublish(
  projects: readonly { id: ProjectId; label: string }[],
): Promise<Set<ProjectId>> {
  const selection = await checkbox<ProjectId>({
    choices: projects.map(({ id, label }) => ({ name: label, value: id })),
    message: "Select draft projects to unpublish",
    theme: { keybindings: ["vim"] },
  });
  const selected = new Set(selection);
  if (selected.size === 0) return selected;

  return (await confirm({
    default: false,
    message: `Unpublish ${selected.size} project${selected.size === 1 ? "" : "s"}?`,
  }))
    ? selected
    : new Set();
}
