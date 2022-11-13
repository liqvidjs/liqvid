## Testing

In order for media codecs to work in the e2e tests, Playwright may need your system Chromium instead of its bundled one. To configure this, rename `.env.example` to `.env` and adjust `PLAYWRIGHT_EXECUTABLE_PATH` as necessary.
