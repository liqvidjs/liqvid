import "node";

declare global {
  // 2. Target the exact global namespace object
  namespace NodeJS {
    interface Process {
      cwd(): import("effect-paths").AbsoluteDir;
    }
  }

  // 3. Force overwrite the global variable instance itself
  var process: NodeJS.Process;
}
