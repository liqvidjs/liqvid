import { test as base, PlaywrightTestConfig } from "@playwright/test";
import * as path from "path";

export { expect } from "@playwright/test";

import { serve } from "./server.ts";

export const test = base.extend<{}, { port: Number }>({
  port: [
    async ({}, use, workerInfo) => {
      const port = 9000 + workerInfo.workerIndex;
      let serve_gen = serve(port);
      await serve_gen.next();
      // Use the server in the tests.
      await use(port);
      // Clean up.
      await serve_gen.next();
    },
    { scope: "worker" },
  ],
});

import { devices } from "playwright";

const config: PlaywrightTestConfig = {
  projects: [
    // "Pixel 4" tests use Chromium browser.
    {
      name: "Pixel 4",
      use: {
        browserName: "chromium",
        ...devices["Pixel 4"],
      },
    },

    // "iPhone 11" tests use WebKit browser.
    {
      name: "iPhone 11",
      use: {
        browserName: "webkit",
        ...devices["iPhone 11"],
      },
    },
  ],
};
export default config;
