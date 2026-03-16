export interface LiqvidStudioServerPlugin {
  postProcessRecording?: (options: {
    /** absolute path to the recording directory */
    dirname: string;
  }) => Promise<void>;
}
