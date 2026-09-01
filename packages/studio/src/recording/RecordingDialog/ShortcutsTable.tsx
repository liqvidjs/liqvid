import { Keymap } from "@liqvid/keymap";
import { isMac } from "@liqvid/utils";
import { useCallback, useState } from "react";

import type { RecordingControlProps } from "../RecordingControl.tsx";

import styles from "./RecordingDialog.module.css";

import type Translations from "../.translations/en.json";

type ShortcutKey = keyof NonNullable<RecordingControlProps["shortcuts"]>;

type T = typeof Translations;

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
    <table className={styles.shortcutsTable}>
      <thead>
        <tr>
          <th>{t.command}</th>
          <th>{t.shortcut}</th>
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
    <tr>
      <td>{label}</td>
      <td>
        <input
          className={styles.shortcutInput}
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
