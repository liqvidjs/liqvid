export function NumericInput(
  props: Omit<React.ComponentProps<"input">, "type" | "onChange"> & {
    onChange: (value: number) => void;
  },
) {
  return (
    /** biome-ignore lint/correctness/noRestrictedElements: this is the styled version */
    <input
      {...props}
      onChange={(e) => props.onChange(e.target.valueAsNumber)}
      type="number"
    />
  );
}
