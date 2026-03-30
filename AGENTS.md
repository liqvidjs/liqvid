# Liqvid Monorepo Agent Guide

This is a monorepo for the Liqvid animation framework - a library for creating interactive videos using HTML/CSS/JavaScript.

## Stack

- TypeScript with ES modules (strict mode, ES2022 target)
- pnpm (v10.25+) for monorepo management with workspaces
- Biome for linting and formatting
- Jest for unit tests, Playwright for e2e tests
- React 18+ with JSX transform

## Packages

**Core Liqvid packages:**

- `main` → `liqvid` (main entry point)
- `assets` → `@liqvid/assets`
- `color-scheme` → `@liqvid/color-scheme`
- `duration` → `@liqvid/duration`
- `event-emitter` → `@liqvid/event-emitter`
- `hydration` → `@liqvid/hydration`
- `iframe-api` → `@liqvid/iframe-api`
- `keymap` → `@liqvid/keymap`
- `media` → `@liqvid/media`
- `playback` → `@liqvid/playback`
- `prompts` → `@liqvid/prompts`
- `recording` → `@liqvid/recording`
- `script` → `@liqvid/script`
- `ssr` → `@liqvid/ssr`
- `studio` → `@liqvid/studio`
- `studio-plugin-api` → `@liqvid/studio-plugin-api`
- `utils` → `@liqvid/utils`

**External/plugin packages** (will be split out later): `cursor`, `have-fun`

**Legacy** (ignore): `captioning`, `server`, `cli`, `dev-watcher`, `dev-watcher-rs`

## Build/Lint/Test Commands

All commands are run from individual package directories (e.g., `packages/utils`).

### Building

```bash
pnpm build          # Full build (clean + compile)
pnpm build:clean    # Remove dist/
pnpm build:js       # Compile TypeScript (ESM + CJS)
```

### Linting

```bash
rtk lint biome           # Run Biome with auto-fix (uses biome.json config)
```

**Important:** Always use `pnpm lint` instead of calling `pnpm biome` directly. The `pnpm lint` script ensures the correct `biome.json` configuration is applied, including proper file exclusions (e.g., `dist/` directories).

### Testing

```bash
# Run all tests in a package
pnpm test

# Run a single test file
npx jest tests/animation.test.ts

# Run tests matching a pattern
npx jest -t "animation/animate"

# Run with coverage
pnpm test --coverage
```

### E2E Tests (main package only)

```bash
pnpm test:playwright

# Run a single e2e test
npx playwright test e2e/tests/specific-test.ts
```

### Running commands for specific packages from root

```bash
pnpm --filter @liqvid/utils test
pnpm --filter liqvid build
```

## Code Style Guidelines

### Formatting (enforced by Biome)

- **Indent:** 2 spaces
- **Line width:** 80 characters
- **Semicolons:** Always required
- **Quotes:** Double quotes (`"`)
- **Trailing commas:** All (including function parameters)
- **Arrow parentheses:** Always (`(x) => x`, not `x => x`)
- **Bracket spacing:** Yes (`{ a, b }`)
- **Line endings:** LF

### Import Organization

Imports must be organized in this order, separated by blank lines:

1. Node.js built-ins
2. External packages
3. Aliases
4. Parent directory imports (`../`)
5. Current directory imports (`./`)
6. CSS imports
7. JSON imports

```typescript
import { readFile } from "node:fs";

import * as React from "react";
import { Keymap } from "@liqvid/keymap";

import { ParentModule } from "../parent";

import { LocalModule } from "./local";

import "./styles.css";
```

Use `type` imports for type-only imports:

```typescript
import type { JSX } from "react";
import type { ThumbData } from "./controls/ScrubberBar";
```

### Naming Conventions

- **PascalCase:** Classes, React components, types, interfaces
- **camelCase:** Functions, variables, methods, parameters
- **SCREAMING_SNAKE_CASE:** Constants (`SECONDS`, `TIMEOUT`)
- **Private fields:** Double underscore prefix (`__valueMs`, `__subscribers`)

### TypeScript

- Strict mode enabled - no implicit any
- Use explicit return types for public API functions
- Non-null assertions (`!`) are allowed when the value is guaranteed
- Prefer interfaces for object shapes, types for unions/aliases

```typescript
interface AnimateOptions {
  startValue?: number;
  endValue?: number;
  startTime: number;
  duration: number;
}

export function animate(options: AnimateOptions): (t: number) => number {
  // ...
}
```

### React Patterns

- Functional components with hooks preferred for new code
- Class components used for complex stateful components (e.g., Player)
- Custom hooks use `use*` prefix (`usePlayback`, `useTime`, `usePlayer`)
- Use `createUniqueContext` from `@liqvid/utils` for context stability
- **Do not use `forwardRef`** - it is deprecated in React 19. Instead, pass `ref` as a regular prop:

```typescript
// Good - React 19 style
interface MyComponentProps {
  ref?: React.Ref<HTMLDivElement>;
  // other props...
}

export function MyComponent({ ref, ...props }: MyComponentProps) {
  return <div ref={ref} {...props} />;
}

// Bad - deprecated
export const MyComponent = forwardRef<HTMLDivElement, Props>((props, ref) => {
  return <div ref={ref} {...props} />;
});
```

```typescript
export function usePlayer(): Player {
  return useContext(Player.Context);
}
```

### Error Handling

- Simple `throw new Error("message")` for errors
- No custom error classes (keep it simple)
- Use Biome ignore comments with explanations when needed:

```typescript
// biome-ignore lint/style/noNonNullAssertion: value is guaranteed by constructor
```

### Test Style

- Use `describe` blocks to group related tests
- Use `test` (not `it`) for individual test cases
- Descriptive test names that explain the scenario

```typescript
describe("animation/animate", () => {
  test("defaults", () => {
    const fn = animate({ duration: 1000, startTime: 0 });
    expect(fn(0)).toBe(0);
  });

  test("called with array", () => {
    // ...
  });
});
```

## Linting Rules

Key Biome rules:

- `useExhaustiveDependencies`: error (React hooks deps)
- `noNonNullAssertion`: off (allowed)
- `useTemplate`: off (string concatenation allowed)
- `useSortedClasses`: enabled for Tailwind (clsx, cva, tw, classNames)
- JSX attributes are sorted automatically

## Project Structure

```
packages/
  main/           # Main liqvid package
    src/          # Source code
    tests/        # Jest unit tests
    e2e/          # Playwright e2e tests
  utils/          # Utility functions
  playback/       # Playback engine
  ...
biome.json        # Linting/formatting config
tsconfig.json     # Root TypeScript config
pnpm-workspace.yaml
```

## Dependencies

- Use `workspace:` protocol for internal dependencies
- Shared versions defined in pnpm workspace catalog
- Packages build to both ESM (`dist/esm/*.mjs`) and CJS (`dist/cjs/*.cjs`)
- Type declarations output to `dist/types/`

### Pluralization

Use the `pluralize` package for pluralizing words in user-facing messages:

```typescript
import pluralize from "pluralize";

// Instead of: `${count} item${count === 1 ? "" : "s"}`
// Use:
console.log(`Found ${count} ${pluralize("item", count)}`);
```

## Pre-existing Errors

Many parts of the codebase have pre-existing TypeScript and linting errors. When making changes, only fix errors directly related to your current changes. Ignore pre-existing errors in other parts of the codebase.
