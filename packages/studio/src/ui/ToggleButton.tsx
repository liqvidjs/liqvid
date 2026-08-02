export function ToggleButton(
  props: Omit<React.ComponentProps<"button">, "type"> &
    Required<Pick<React.ComponentProps<"button">, "aria-pressed">>,
) {
  // biome-ignore lint/correctness/noRestrictedElements: this is a semantic component
  return <button {...props} type="button" />;
}
