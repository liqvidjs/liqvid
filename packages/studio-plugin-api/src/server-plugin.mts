import type { Effect, FileSystem } from "effect";
import type { AbsoluteDir } from "effect-paths";

export interface LiqvidStudioServerPlugin<C = unknown> {
  postProcessRecording?: (options: {
    config: C;

    /** The decoded project configuration from liqvid.json. */
    projectConfig?: unknown;

    /** absolute path to the recording directory */
    dirname: AbsoluteDir;
  }) => Effect.Effect<void, unknown, FileSystem.FileSystem> | Promise<void>;
}
