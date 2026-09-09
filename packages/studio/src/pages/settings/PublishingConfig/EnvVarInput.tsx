"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import * as stylex from "@stylexjs/stylex";
import { useRef, useState } from "react";

import { colors, radii, spacing, text } from "#_/design/tokens.stylex.js";
import type { LocalizedString } from "#_/i18n/shared.mjs";
import { PlainString } from "#_/i18n/shared.mjs";

import { styles as parentStyles } from "./client.tsx";

type Mode = "literal" | "env";

/** Parsed representation of a StringWithEnvVars value. */
type Parsed =
  | { mode: "literal"; value: string }
  | { mode: "env"; varName: string; environment: string };

const ENV_PATTERN = /^\{env:([^}]+)\}$/;

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

const envStyles = stylex.create({
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

  fileInput: {
    background: colors.graySubtle,
    borderColor: colors.graySep,
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: "1px",
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

  radioGroup: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.md,
  },

  radioIndicator: {
    backgroundColor: colors.accentSolid,
    borderRadius: radii.circle,
    height: "0.5rem",
    width: "0.5rem",
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

  radioRoot: {
    alignItems: "center",
    appearance: "none",
    borderColor: {
      default: colors.graySep,
    },
    borderRadius: radii.circle,
    borderStyle: "solid",
    borderWidth: "2px",
    cursor: "pointer",
    display: "flex",
    flexShrink: 0,
    height: "1rem",
    justifyContent: "center",
    marginTop: "2px",
    padding: spacing.zero,
    width: "1rem",
  },
});

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
        {...stylex.props(envStyles.radioGroup)}
      >
        {!disallowLiteral && (
          <div sx={envStyles.radioOption}>
            <span sx={envStyles.radioLabel}>
              <Radio.Root
                value="literal"
                {...stylex.props(envStyles.radioRoot)}
              >
                <Radio.Indicator {...stylex.props(envStyles.radioIndicator)} />
              </Radio.Root>
              <span>{t.valueOption}</span>
            </span>

            {mode === "literal" && (
              <input
                onChange={(e) => handleLiteralChange(e.target.value)}
                placeholder={placeholder}
                sx={parentStyles.input}
                type="text"
                value={literal}
              />
            )}
          </div>
        )}

        <div sx={envStyles.radioOption}>
          <span sx={envStyles.radioLabel}>
            <Radio.Root value="env" {...stylex.props(envStyles.radioRoot)}>
              <Radio.Indicator {...stylex.props(envStyles.radioIndicator)} />
            </Radio.Root>
            <span>{t.envVarOption}</span>
          </span>

          {mode === "env" && (
            <div sx={envStyles.envFields}>
              <label sx={parentStyles.field}>
                <span sx={parentStyles.fieldLabel}>{t.envVarName}</span>
                <input
                  onChange={(e) => handleVarNameChange(e.target.value)}
                  placeholder="MY_VAR"
                  sx={parentStyles.input}
                  type="text"
                  value={varName}
                />
              </label>

              <label sx={parentStyles.field}>
                <span sx={parentStyles.fieldLabel}>{t.envVarEnvFile}</span>
                <div sx={envStyles.envRow}>
                  <span sx={envStyles.filePrefix}>{PlainString(".env.")}</span>
                  <input
                    onChange={(e) => handleEnvironmentChange(e.target.value)}
                    placeholder="production"
                    sx={envStyles.fileInput}
                    type="text"
                    value={environment}
                  />
                </div>
                <span sx={envStyles.envFileHint}>{t.envVarEnvFileHint}</span>
              </label>
            </div>
          )}
        </div>
      </RadioGroup>
    </div>
  );
}
