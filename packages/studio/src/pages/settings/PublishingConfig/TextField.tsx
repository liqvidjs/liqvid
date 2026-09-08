"use client";
import * as stylex from "@stylexjs/stylex";

import { styles } from "./client.tsx";

export function TextField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label {...stylex.props(styles.field)}>
      <span {...stylex.props(styles.fieldLabel)}>{label}</span>
      <input
        {...stylex.props(styles.input)}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </label>
  );
}
