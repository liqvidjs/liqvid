## Look and feel

For theming, use the CSS variables in `src/palette.css`.

## Libraries

Use Phosphor icons from `@phosphor-icons/react`. Icons are named in PascalCase, and must always end in `Icon`, e.g. `CameraIcon`. Use the `weight` prop for variants: `"thin"`, `"light"`, `"regular"` (default), `"bold"`, `"fill"`, or `"duotone"`.

For displaying formatted times, use the `<Time>` component in `src/ui/Time.tsx`. If you need direct access use the `formatTime`, `formatTimeMs`, and `formatTimeDuration` functions from `@liqvid/utils`, but prefer the `<Time>` where possible.

### Base UI

Use Base UI (`@base-ui/react`) for primitives like dialogs. When building a dialog, the `<Dialog.Popup>` part (Base UI's equivalent of Radix's `<Dialog.Content>`) should be split into a separate file. The consumer is responsible for passing `<DialogRoot>` and `<DialogTrigger>` (since we may want to open the same dialog from multiple different triggers throughout the app).

Use the styled wrappers from @packages/studio/src/ui/Dialog.tsx (`DialogRoot`, `DialogTrigger`, `DialogPortal`, `DialogBackdrop`, `DialogPopup`, `DialogTitle`, `DialogClose`) instead of importing from `@base-ui/react/dialog` directly.

## Effect

This package uses **Effect v4 beta** (`effect@4.0.0-beta.93`, `@effect/platform-node@4.0.0-beta.93`), NOT Effect v3. The API differs significantly from v3 docs/blog posts — do not copy v3 patterns.

### Imports

- HTTP API pieces come from `effect/unstable/*` (unstable is expected here):
  - `effect/unstable/httpapi` → `HttpApi`, `HttpApiEndpoint`, `HttpApiGroup`, `HttpApiBuilder`, `HttpApiClient`, `HttpApiSchema`, `HttpApiSwagger`, `OpenApi`
  - `effect/unstable/http` → `HttpClient`, `FetchHttpClient`, `Etag`, `HttpRouter` (`toWebHandler` lives at `effect/unstable/http/HttpRouter`)
- `Schema`, `Effect`, `Layer`, `Option`, `FileSystem`, `ManagedRuntime`, `PlatformError` are top-level: `import { ... } from "effect"`.
- Node platform layers come from `@effect/platform-node`: `NodeServices.layer` (FileSystem + Path), `NodeHttpPlatform.layer`, `NodeFileSystem.layer`.

### Schema (v4 beta specifics)

- Access the decoded type via `(typeof MySchema)["Type"]`, not `Schema.Schema.Type<...>`.
- Use `Schema.Literals([...])` (plural) for enums, `Schema.NullOr`, `Schema.optional(...)`, `Schema.Struct`, `Schema.Array`.
- JSON-string schemas: `Schema.fromJsonString(schema)`.
- Effect-Schema versions of shared schemas live in `@liqvid/schemas/effect` (separate from the zod versions in the default entry).

### HttpApi endpoints

Everything is declared in the constructor's `options` object — there are NO fluent `.setPayload()/.addSuccess()/.addError()` builders (that was v3).

```ts
HttpApiEndpoint.get("list", "/screenshots", {
  query: Schema.Struct({ projectPath: Schema.String }), // URL search params
  success: Schema.Array(ScreenshotEntry),
});
HttpApiEndpoint.post("capture", "/screenshots/capture", {
  query: ...,        // search params
  payload: ...,      // JSON body
  success: ...,
  error: [InvalidError, NotFoundError], // schema errors, single or array
});
```

- `query` = URL search params, `params` = path params (`:id`), `payload` = request body. Do not use `params` for `?foo=` values.
- DELETE endpoint constructor is exported as `HttpApiEndpoint.delete` (not `del`).
- Handler request shape mirrors the options: destructure `{ query, payload, params }`.

### Errors → HTTP status

Define API errors with `Schema.TaggedErrorClass` and a `httpApiStatus` annotation (see `src/utils/errors.mts`: `NotFoundError`, `InvalidError`, `ConflictError`). Add them to an endpoint's `error` to surface a typed status; the framework maps the annotation to the response code.

- Errors declared in the endpoint's `error` flow through the handler's typed error channel (`Effect.fail`/`yield* new NotFoundError(...)`).
- Unexpected failures (e.g. `PlatformError` from FileSystem) should become defects so they render as 500: `Effect.catchTag("PlatformError", Effect.die)` or `Effect.orDie`. Only convert a `PlatformError` to a typed error when it's meaningful (e.g. `reason._tag === "NotFound"` → `NotFoundError`).

### Server wiring (Next.js)

- The web API is defined in `src/api/contract-effect.mts` (`WebApi`), implemented per-group with `HttpApiBuilder.group(WebApi, "<group>", handlers => ...)` in `src/api/*.mts`, and served in `src/next/api.mts` via `toWebHandler(HttpApiBuilder.layer(WebApi).pipe(Layer.provide([...groupLives]), Layer.provide([NodeServices.layer, NodeHttpPlatform.layer, Etag.layerWeak])))`.
- `src/next/api.mts` still contains a legacy hand-rolled switch router; migrated routes are delegated to the Effect handler via `isEffectApiRoute`. When migrating a route, add its group `*Live` layer, add its path prefix to `effectApiRoutePrefixes`, and remove the old switch case + zod op from `src/api/contract.mts`.

### Client

- Derive the browser client with `HttpApiClient.make(WebApi)` (see `src/client.mts`, exported as `LiqvidStudioApiClient`), run it with `clientRuntime.runPromise(...)` where `clientRuntime = ManagedRuntime.make(FetchHttpClient.layer)`.
- Call endpoints as `client.<group>.<endpoint>({ query, payload })` inside `Effect.gen`.
- Legacy zod operations in `src/api/contract.mts` + `makeFetcher` in `src/client.mts` still exist for not-yet-migrated routes; prefer the Effect client for new/migrated work.
