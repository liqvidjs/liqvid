export declare module "node:fs/promises" {
  import type { BufferEncoding, ObjectEncodingOptions } from "node:fs";

  import type { AnyPath, RelativePath } from "effect-paths";

  function readdir<P extends AnyPath>(
    path: P,
    options?:
      | (ObjectEncodingOptions & {
          withFileTypes?: false | undefined;
          recursive?: boolean | undefined;
        })
      | BufferEncoding
      | null,
  ): Promise<
    P extends import("effect-paths").AbsoluteDir ? RelativePath[] : never
  >;
}
