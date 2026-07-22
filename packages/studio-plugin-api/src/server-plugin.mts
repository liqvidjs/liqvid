import type { Effect, FileSystem } from "effect";
import type { AbsoluteDir } from "effect-paths";

export interface LiqvidStudioServerPlugin {
  postProcessRecording?: (options: {
    /** absolute path to the recording directory */
    dirname: AbsoluteDir;
  }) => Effect.Effect<void, unknown, FileSystem.FileSystem> | Promise<void>;
}
