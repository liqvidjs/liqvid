declare module "node:url" {
  import type { AbsolutePath } from "effect-paths";

  function fileURLToPath(
    url: string | URL,
    options?: FileUrlToPathOptions,
  ): AbsolutePath;
}
