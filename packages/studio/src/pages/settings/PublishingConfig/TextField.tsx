"use client";

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
  value: string | undefined;
}) {
  return (
    <label sx={styles.field}>
      <span sx={styles.fieldLabel}>{label}</span>
      <input
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        sx={styles.input}
        type="text"
        value={value}
      />
    </label>
  );
}
