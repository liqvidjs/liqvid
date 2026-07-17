# effect-paths

This provides helpers for working with paths in [Effect-TS](https://effect.website). Specifically, it provides branded types for absolute vs relative paths, and for directories vs files. This uses Effect v4 Beta.


## Installation

```bash
npm install effect-paths
```

## Example

```ts
// AbsoluteFile
const a = path.join(process.cwd(), RelativeFile("project.json"))

// AbsoluteDir
const b = path.join(process.cwd(), RelativeDir("config"))

// AbsolutePath
const c = path.join(process.cwd(), RelativeDir("config") as RelativePath)

// RelativeDir
const d = path.join(RelativeDir("a"), RelativeDir("b"))

// RelativeFile
const e = path.join(RelativeDir("a"), RelativeFile("package.json"))

// RelativePath
const f = path.join(
  RelativeDir("a"),
  RelativeFile("package.json") as RelativePath,
);

// Error
const g = path.join(RelativeFile("x"), RelativeFile("a"));
```
