#! /usr/bin/env node
// biome-ignore-all lint/suspicious/noConsole: CLI wrapper that reports errors on stderr

import { main } from "./dist/esm/jobs/validate-translations.mjs";

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
