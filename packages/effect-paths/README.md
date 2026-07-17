# effect-paths

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

// never
const g = path.join(RelativeFile("x"), RelativeFile("a"));
```
