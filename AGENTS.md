# Liqvid Monorepo Agent Guide

Monorepo for the Liqvid animation framework - interactive videos using HTML/CSS/JS.

## Stack

TypeScript (strict, ES2022, ESM) · pnpm 10.25+ workspaces · Biome (lint/format) · Jest (unit) + Playwright (e2e) · React 18+

## Packages (`packages/*`)

Core: `main`→`liqvid`, plus `@liqvid/{assets,color-scheme,duration,event-emitter,hydration,iframe-api,keymap,media,playback,prompts,recording,script,ssr,studio,studio-plugin-api,utils}`

Plugin: `cursor`. Legacy (ignore): `captioning`, `server`, `cli`, `dev-watcher`, `dev-watcher-rs`

## Commands

Run from a package dir (e.g. `packages/utils`), or from root via `pnpm --filter <pkg> <cmd>`.

```bash
pnpm build                       # clean + compile (ESM + CJS)
pnpm lint --reporter=concise     # Biome auto-fix; use pnpm lint:agent, never bare biome
pnpm test                        # all tests (--coverage for coverage)
npx jest tests/foo.test.ts       # single file
npx jest -t "pattern"            # by name
pnpm test:playwright             # e2e (main package only)
npx playwright test e2e/tests/x.ts
```

## Code Style (Biome-enforced)

- 2-space indent, 80 col, semicolons, double quotes, trailing commas (all), arrow parens always, bracket spacing, LF
- Import order (blank-line separated): node builtins → external → aliases → `../` → `./` → CSS → JSON. Use `import type` for type-only.
- Naming: PascalCase (classes/components/types), camelCase (functions/vars), SCREAMING_SNAKE_CASE (constants), `__prefix` (private fields)

## TypeScript

- Strict, no implicit any. Explicit return types on public API. `!` allowed when guaranteed. Prefer `type` over `interface`.

## React

- Prefer functional components + hooks; class components for complex state (e.g. Player). Custom hooks use `use*`.
- Use `createUniqueContext` from `@liqvid/utils` for context stability.
- **No `forwardRef`** (deprecated in React 19) — pass `ref` as a regular prop:

```typescript
function MyComponent({ ref, ...props }: { ref?: React.Ref<HTMLDivElement> }) {
  return <div ref={ref} {...props} />;
}
```

## Other Conventions

- Errors: plain `throw new Error("message")`, no custom classes.
- Biome ignores need an explanation comment: `// biome-ignore lint/...: reason`
- Tests: `describe` groups, `test` (not `it`), descriptive names.

## Dependencies & Output

- Internal deps use `workspace:` protocol; shared versions in pnpm catalog.
- Builds to ESM (`dist/esm/*.mjs`), CJS (`dist/cjs/*.cjs`), types (`dist/types/`).

## Pre-existing Errors

Codebase has pre-existing TS/lint errors. Only fix errors related to your changes; ignore others.
