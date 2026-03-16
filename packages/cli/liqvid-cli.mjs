#! /usr/bin/env node

import * as pkg from "./dist/esm/index.mjs";

pkg
  .main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
