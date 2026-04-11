## Look and feel

For theming, use the CSS variables in `src/palette.css`.

## Libraries

Use Phosphor icons from `@phosphor-icons/react`. Icons are named in PascalCase, and must always end in `Icon`, e.g. `CameraIcon`. Use the `weight` prop for variants: `"thin"`, `"light"`, `"regular"` (default), `"bold"`, `"fill"`, or `"duotone"`.

For formatting times, use the `formatTime`, `formatTimeMs`, and `formatTimeDuration` functions from `@liqvid/utils/time`.

### Radix

When using Radix dialogs (either `@radix-ui/react-alert-dialog` or `@radix-ui/react-dialog`), the `<Dialog.Content>` part should be split into a separate file. The consumer is responsible for passing `<Dialog.Root>` and `<Dialog.Trigger>` (since we may want to open the same dialog from multiple different triggers throughout the app).

Use `DialogRoot` from @packages/studio/src/ui/Dialog.tsx instead of accessing `<Dialog.Root>` directly.
