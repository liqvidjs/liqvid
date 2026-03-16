## Look and feel

For theming, use the CSS variables in `src/palette.css`.

## Libraries

Phosphor icons need to have the `Icon` suffix, e.g. `CameraIcon` instead of `Camera`.

For formatting times, use the `formatTime`, `formatTimeMs`, and `formatTimeDuration` functions from `@liqvid/utils/time`.

### Radix

When using Radix dialogs (either `@radix-ui/react-alert-dialog` or `@radix-ui/react-dialog`), the `<Dialog.Content>` part should be split into a separate file. The consumer is responsible for passing `<Dialog.Root>` and `<Dialog.Trigger>` (since we may want to open the same dialog from multiple different triggers throughout the app).

Use `DialogRoot` from @packages/studio/src/ui/Dialog.tsx instead of accessing `<Dialog.Root>` directly.
