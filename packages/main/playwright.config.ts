import dotenv from "dotenv";
dotenv.config();

import type {PlaywrightTestConfig} from "@playwright/test";
const config: PlaywrightTestConfig = {
  testDir: "e2e/tests",
  use: {
    baseURL: process.env.PLAYWRIGHT_HOST,
    headless: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
    },
    viewport: {width: 1280, height: 720},
    ignoreHTTPSErrors: true,
    video: "off",
  },
  webServer: {
    command: "cd e2e/app && pnpm build && pnpm serve",
    url: process.env.PLAYWRIGHT_HOST,
    reuseExistingServer: !process.env.CI,
  },
};
export default config;
