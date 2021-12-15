#! /usr/bin/env node
import * as pkg from "./dist/index.js";

pkg.main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
