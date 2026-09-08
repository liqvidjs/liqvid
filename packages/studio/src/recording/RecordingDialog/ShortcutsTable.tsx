import { Keymap } from "@liqvid/keymap";
import { isMac } from "@liqvid/utils";
import * as stylex from "@stylexjs/stylex";
import { useCallback, useState } from "react";

import { colors, dims, radii, spacing, text } from "#_/design/tokens.stylex.js";

import type { RecordingControlProps } from "../RecordingControl.tsx";

import type Translations from "../.translations/en.json";

type ShortcutKey = keyof NonNullable<RecordingControlProps["shortcuts"]>;

type T = typeof Translations;

const spin = stylex.keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
  shortcutInput: {
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
    fontFamily: "monospace",
    fontSize: text.sm,
    outline: {
      ":focus": "none",
      default: null,
    },
    padding: `${spacing.md} ${spacing.lg}`,
    textAlign: "center",
    width: "100%",
  },

  shortcutInputRecording: {
    backgroundColor: "light-dark(#fffbe6, #3d3800)",
    borderColor: "light-dark(#d9a600, #665000)",
  },

  shortcutsBodyRow: {
    backgroundColor: {
      ":hover": colors.grayHover,
      default: null,
    },
  },

  shortcutsCell: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.graySep,
    paddingBlock: '6px',
    paddingInline: '8px',
    textAlign: "left",
  },

  shortcutsTable: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.graySep,
    borderCollapse: "collapse",
    marginBlock: '0.5em',
    marginInline: '0',
    width: "100%",
  },

  shortcutsTheadTh: {
    backgroundColor: colors.grayUi,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.graySep,
    fontSize: "12px",
    fontWeight: 600,
    paddingBlock: '6px',
    paddingInline: '8px',
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
    <table {...stylex.props(styles.shortcutsTable)}>
      <thead>
        <tr>
          <th {...stylex.props(styles.shortcutsTheadTh)}>{t.command}</th>
          <th {...stylex.props(styles.shortcutsTheadTh)}>{t.shortcut}</th>
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
    <tr {...stylex.props(styles.shortcutsBodyRow)}>
      <td {...stylex.props(styles.shortcutsCell)}>{label}</td>
      <td {...stylex.props(styles.shortcutsCell)}>
        <input
          {...stylex.props(
            styles.shortcutInput,
            isRecording && styles.shortcutInputRecording,
          )}
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
