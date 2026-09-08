import { Keymap } from "@liqvid/keymap";
import { isMac } from "@liqvid/utils";
import * as stylex from "@stylexjs/stylex";
import { useCallback, useState } from "react";

import {
  colors,
  dims,
  radii,
  spacing,
  text,
  typeface,
} from "#_/design/tokens.stylex.js";
import type { Localized } from "#_/utils/i18n.mjs";

import type { RecordingControlProps } from "../RecordingControl.tsx";

import type Translations from "../.translations/en.json";

type ShortcutKey = keyof NonNullable<RecordingControlProps["shortcuts"]>;

type T = Localized<typeof Translations>;

const styles = stylex.create({
  bodyRow: {
    backgroundColor: {
      ":hover": colors.grayHover,
      default: null,
    },
  },

  cell: {
    borderColor: colors.graySep,
    borderStyle: "solid",
    borderWidth: "1px",
    paddingBlock: "6px",
    paddingInline: "8px",
    textAlign: "left",
  },

  input: {
    "::placeholder": {
      color: colors.grayDim,
      fontStyle: "italic",
    },
    backgroundColor: colors.graySubtle,
    borderColor: {
      ":focus": colors.accentSolid,
      default: colors.graySep,
    },
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    cursor: "pointer",
    fontFamily: typeface.mono,
    fontSize: text.sm,
    outline: {
      ":focus": "none",
      default: null,
    },
    padding: `${spacing.md} ${spacing.lg}`,
    textAlign: "center",
    width: "100%",
  },

  inputRecording: {
    backgroundColor: "light-dark(#fffbe6, #3d3800)",
    borderColor: "light-dark(#d9a600, #665000)",
  },

  table: {
    borderCollapse: "collapse",
    borderColor: colors.graySep,
    borderStyle: "solid",
    borderWidth: "1px",
    marginBlock: "0.5em",
    marginInline: "0",
    width: "100%",
  },

  theadTh: {
    backgroundColor: colors.grayUi,
    borderColor: colors.graySep,
    borderStyle: "solid",
    borderWidth: "1px",
    fontSize: "12px",
    fontWeight: 600,
    paddingBlock: "6px",
    paddingInline: "8px",
    textAlign: "left",
    textTransform: "uppercase",
  },
});

const shortcutCommands: [string, ShortcutKey][] = [
  ["Toggle panel", "toggle"],
  ["Start/Stop recording", "startStop"],
  ["Pause recording", "pause"],
  ["Discard recording", "discard"],
];

/** @package */
export function ShortcutsTable({
  shortcuts,
  onShortcutChange,
  t,
}: {
  shortcuts?: RecordingControlProps["shortcuts"];
  onShortcutChange?: (key: ShortcutKey, value: string) => void;
  t: T["tabs"]["shortcuts"];
}) {
  return (
    <table {...stylex.props(styles.table)}>
      <thead>
        <tr>
          <th {...stylex.props(styles.theadTh)}>{t.command}</th>
          <th {...stylex.props(styles.theadTh)}>{t.shortcut}</th>
        </tr>
      </thead>
      <tbody>
        {shortcutCommands.map(([label, key]) => (
          <ShortcutRow
            key={key}
            label={label}
            onChange={
              onShortcutChange
                ? (value) => onShortcutChange(key, value)
                : undefined
            }
            shortcut={shortcuts?.[key]}
          />
        ))}
      </tbody>
    </table>
  );
}

function ShortcutRow({
  label,
  shortcut,
  onChange,
}: {
  label: string;
  shortcut?: string;
  onChange?: (value: string) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [localValue, setLocalValue] = useState<string | undefined>(undefined);

  const displayValue = localValue ?? shortcut;

  const identifyKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.preventDefault();

      const seq = Keymap.identify(e as unknown as KeyboardEvent);
      setLocalValue(seq);
      onChange?.(seq);
      setIsRecording(false);
    },
    [onChange],
  );

  const handleFocus = useCallback(() => {
    setIsRecording(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsRecording(false);
  }, []);

  return (
    <tr {...stylex.props(styles.bodyRow)}>
      <td {...stylex.props(styles.cell)}>{label}</td>
      <td {...stylex.props(styles.cell)}>
        <input
          {...stylex.props(styles.input, isRecording && styles.inputRecording)}
          data-recording={isRecording || undefined}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={identifyKey}
          placeholder={isRecording ? "Press a key..." : "Click to record"}
          readOnly
          type="text"
          value={displayValue ? fmtSeq(displayValue) : ""}
        />
      </td>
    </tr>
  );
}

/** Format key sequences with special characters on Mac */
function fmtSeq(str: string) {
  if (!isMac) return str;
  if (str === undefined) return str;
  return str
    .split("+")
    .map((k) => {
      if (k === "Ctrl") return "^";
      else if (k === "Alt") return "\u2325";
      if (k === "Shift") return "\u21E7";
      if (k === "Meta") return "\u2318";
      return k;
    })
    .join("");
}
