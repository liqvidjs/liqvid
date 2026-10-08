const { createRequire } = require("node:module");
const path = require("node:path");
const { TextDecoder, TextEncoder } = require("node:util");

const packageRequire = createRequire(path.join(process.cwd(), "package.json"));
globalThis.jest = packageRequire("@jest/globals").jest;
globalThis.TextDecoder ??= TextDecoder;
globalThis.TextEncoder ??= TextEncoder;
