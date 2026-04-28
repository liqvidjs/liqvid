import dotenv from "dotenv";

dotenv.config();

import type { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  testDir: "e2e/tests",
  use: {
    baseURL: process.env.PLAYWRIGHT_HOST,
    headless: true,
    ignoreHTTPSErrors: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
    },
    video: "off",
    viewport: { height: 720, width: 1280 },
  },
  webServer: {
    command: "cd e2e/app && pnpm serve",
    reuseExistingServer: !process.env.CI,
    url: process.env.PLAYWRIGHT_HOST,
  },
};
export default config;
