import { HttpApiGroup } from "effect/unstable/httpapi";

import { Authorization } from "../../authorization.ts";

import { deleteFiles } from "./deleteFiles.ts";
import { listFiles } from "./listFiles.ts";
import { uploadFiles } from "./uploadFiles.ts";

export class Files extends HttpApiGroup.make("files")
  .add(listFiles, uploadFiles, deleteFiles)
  .middleware(Authorization) {}
