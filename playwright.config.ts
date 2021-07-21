import { PlaywrightTestConfig } from '@playwright/test';
import { devices } from 'playwright';

const config: PlaywrightTestConfig = {
  testDir: "test-playwright",
  projects: [
    {
        name: 'Webkit',
        use: {
          browserName: 'webkit',
        },
    },

    {
        name: 'Chromium',
        use: {
          browserName: 'chromium',
        },
    },

    {
        name: 'Firefox',
        use: {
          browserName: 'firefox',
        },
    },

    // "Pixel 4" tests use Chromium browser.
    {
      name: 'Pixel 4',
      use: {
        browserName: 'chromium',
        ...devices['Pixel 4'],
      },
    },

    // "iPhone 11" tests use WebKit browser.
    {
      name: 'iPhone 11',
      use: {
        browserName: 'webkit',
        ...devices['iPhone 11'],
      },
    },
  ],
};
export default config;
