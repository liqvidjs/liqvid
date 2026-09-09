"use client";

import { RadioGroup } from "@base-ui/react/radio-group";
import * as stylex from "@stylexjs/stylex";
import { useRef, useState } from "react";

import { colors, dims, radii, spacing, text } from "#_/design/tokens.stylex.js";
import type { LocalizedString } from "#_/i18n/shared.mjs";
import { PlainString } from "#_/i18n/shared.mjs";
import { RadioIndicator, RadioRoot } from "#_/ui/Radio.js";

type Mode = "literal" | "env";

/** Parsed representation of a StringWithEnvVars value. */
type Parsed =
  | { mode: "literal"; value: string }
  | { mode: "env"; varName: string; environment: string };

const ENV_PATTERN = /^\{env:([^}]+)\}$/;

const styles = stylex.create({
  envFields: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  envFileHint: {
    color: colors.grayDim,
    fontSize: text.xs,
    marginTop: spacing.xs,
  },

  envRow: {
    alignItems: "center",
    display: "flex",
    gap: spacing.md,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
    marginTop: spacing.lg,
  },

  fieldLabel: {
    color: colors.grayDim,
    fontSize: text.sm,
  },

  fileInput: {
    background: colors.graySubtle,
    borderColor: colors.graySep,
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.grayNormal,
    fontSize: text.sm,
    maxWidth: "10rem",
    outline: {
      ":focus-visible": `2px solid ${colors.accentSolid}`,
      default: null,
    },
    outlineOffset: {
      ":focus-visible": "1px",
      default: null,
    },
    padding: `${spacing.sm} ${spacing.md}`,
    width: "100%",
  },

  filePrefix: {
    color: colors.grayDim,
    flexShrink: 0,
    fontSize: text.sm,
    userSelect: "none",
  },

  input: {
    background: colors.graySubtle,
    borderColor: colors.graySep,
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.grayNormal,
    fontSize: text.base,
    maxWidth: "24rem",
    outline: {
      ":focus-visible": `2px solid ${colors.accentSolid}`,
      default: null,
    },
    outlineOffset: {
      ":focus-visible": "1px",
      default: null,
    },
    padding: `${spacing.md} ${spacing.lg}`,
    width: "100%",
  },

  radioGroup: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.md,
  },

  radioLabel: {
    alignItems: "flex-start",
    cursor: "pointer",
    display: "flex",
    gap: spacing.md,
  },

  radioOption: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
  },
});

/** Parse a raw StringWithEnvVars string into its structured form. */
function parse(raw: string | undefined): Parsed {
  if (raw === undefined || raw === "") {
    return { mode: "literal", value: "" };
  }

  const match = ENV_PATTERN.exec(raw);
  if (!match) {
    return { mode: "literal", value: raw };
  }

  const content = match[1]!;
  const parts = content.split(":");

  if (parts.length === 1) {
    return { environment: "", mode: "env", varName: parts[0]! };
  }

  if (parts.length === 2) {
    return { environment: parts[0]!, mode: "env", varName: parts[1]! };
  }

  // Malformed -- treat as literal
  return { mode: "literal", value: raw };
}

/** Serialize a structured form back to a StringWithEnvVars string. */
function serialize(parsed: Parsed): string {
  if (parsed.mode === "literal") {
    return parsed.value;
  }

  if (parsed.environment === "") {
    return `{env:${parsed.varName}}`;
  }

  return `{env:${parsed.environment}:${parsed.varName}}`;
}

export function EnvVarInput({
  disallowLiteral = false,
  onChange,
  placeholder,
  t,
  value,
}: {
  disallowLiteral?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  t: {
    envVarEnvFile: LocalizedString;
    envVarEnvFileHint: LocalizedString;
    envVarMode: LocalizedString;
    envVarName: LocalizedString;
    envVarOption: LocalizedString;
    valueOption: LocalizedString;
  };
  value: string | undefined;
}) {
  const initial = useRef(parse(value)).current;
  const [mode, setMode] = useState<Mode>(
    disallowLiteral ? "env" : initial.mode,
  );
  const [literal, setLiteral] = useState(
    initial.mode === "literal" ? initial.value : "",
  );
  const [varName, setVarName] = useState(
    initial.mode === "env" ? initial.varName : "",
  );
  const [environment, setEnvironment] = useState(
    initial.mode === "env" ? initial.environment : "",
  );

  function emit(next: Parsed) {
    const serialized = serialize(next);
    onChange(serialized === "" ? "" : serialized);
  }

  function handleModeChange(nextMode: Mode) {
    setMode(nextMode);
    if (nextMode === "literal") {
      emit({ mode: "literal", value: literal });
    } else {
      emit({ environment, mode: "env", varName });
    }
  }

  function handleLiteralChange(v: string) {
    setLiteral(v);
    emit({ mode: "literal", value: v });
  }

  function handleVarNameChange(v: string) {
    setVarName(v);
    emit({ environment, mode: "env", varName: v });
  }

  function handleEnvironmentChange(v: string) {
    setEnvironment(v);
    emit({ environment: v, mode: "env", varName });
  }

  return (
    <div>
      <RadioGroup
        onValueChange={(v) => handleModeChange(v as Mode)}
        value={mode}
        {...stylex.props(styles.radioGroup)}
      >
        {!disallowLiteral && (
          <div sx={styles.radioOption}>
            <label sx={styles.radioLabel}>
              <RadioRoot value="literal">
                <RadioIndicator />
              </RadioRoot>
              <span>{t.valueOption}</span>
            </label>

            {mode === "literal" && (
              <input
                onChange={(e) => handleLiteralChange(e.target.value)}
                placeholder={placeholder}
                sx={styles.input}
                type="text"
                value={literal}
              />
            )}
          </div>
        )}

        <div sx={styles.radioOption}>
          <span sx={styles.radioLabel}>
            <RadioRoot value="env">
              <RadioIndicator />
            </RadioRoot>
            <span>{t.envVarOption}</span>
          </span>

          {mode === "env" && (
            <div sx={styles.envFields}>
              <label sx={styles.field}>
                <span sx={styles.fieldLabel}>{t.envVarName}</span>
                <input
                  onChange={(e) => handleVarNameChange(e.target.value)}
                  placeholder="MY_VAR"
                  sx={styles.input}
                  type="text"
                  value={varName}
                />
              </label>

              <label sx={styles.field}>
                <span sx={styles.fieldLabel}>{t.envVarEnvFile}</span>
                <div sx={styles.envRow}>
                  <span sx={styles.filePrefix}>{PlainString(".env.")}</span>
                  <input
                    onChange={(e) => handleEnvironmentChange(e.target.value)}
                    placeholder="production"
                    sx={styles.fileInput}
                    type="text"
                    value={environment}
                  />
                </div>
                <span sx={styles.envFileHint}>{t.envVarEnvFileHint}</span>
              </label>
            </div>
          )}
        </div>
      </RadioGroup>
    </div>
  );
}
