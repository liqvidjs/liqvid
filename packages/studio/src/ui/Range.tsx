export function Range({
  onChange,
  ...props
}: Omit<React.ComponentProps<"input">, "type" | "onChange"> & {
  onChange?: (value: number) => void;
}) {
  return (
    // biome-ignore lint/correctness/noRestrictedElements: this is the styled version
    <input
      onChange={(e) => onChange?.(e.target.valueAsNumber)}
      type="range"
      {...props}
    />
  );
}
