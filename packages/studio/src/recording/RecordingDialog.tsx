import { Collapsible } from "@base-ui/react/collapsible";
import { Keymap } from "@liqvid/keymap";
import { useRecordingApi } from "@liqvid/recording";
import type { RecordingMeta } from "@liqvid/schemas";
import { usePluginApi } from "@liqvid/studio-plugin-api";
import { formatTime, formatTimeDuration } from "@liqvid/utils";
import { Fragment, useCallback, useEffect, useState } from "react";

import { listRecordings } from "../client.mts";
import { useProjectContext } from "../LiqvidDevToolsProvider";
import { DockableDialog } from "../ui/DockableDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/Tabs";
import { useToggle } from "../utils/react.mts";

import type { RecordingControlProps } from "./RecordingControl";

import styles from "./RecordingDialog.module.css";

export interface RecordingDialogProps {
  shortcuts?: RecordingControlProps["shortcuts"];
  onShortcutChange?: (
    key: keyof NonNullable<RecordingControlProps["shortcuts"]>,
    value: string,
  ) => void;
}

export function RecordingDialog({
  shortcuts,
  onShortcutChange,
}: RecordingDialogProps) {
  const { projectPath } = useProjectContext();
  const { enabledPlugins, togglePlugin } = useRecordingApi();
  const { plugins } = usePluginApi();

  const [recordings, setRecordings] = useState<RecordingMeta[]>([]);

  useEffect(() => {
    listRecordings({ search: { url: projectPath } }).then(($res) => {
      if ($res.isErr) {
        console.error($res.unwrapErr());
        return;
      }
      setRecordings($res.unwrap());
    });
  }, [projectPath]);

  return (
    <DockableDialog.Dialog>
      <DockableDialog.Header>Recording</DockableDialog.Header>
      <DockableDialog.Content>
        <div id="lv-recording-dialog">
          <Tabs defaultValue="configuration">
            <TabsList>
              <TabsTrigger className="lv-recording-tabs" value="configuration">
                Configuration
              </TabsTrigger>
              <TabsTrigger className="lv-recording-tabs" value="saved">
                Recordings
              </TabsTrigger>
              <TabsTrigger className="lv-recording-tabs" value="shortcuts">
                Shortcuts
              </TabsTrigger>
            </TabsList>
            <TabsContent asChild value="configuration">
              <section>
                <h3>Plugins</h3>

                <div className={styles.togglePlugins}>
                  {Object.values(plugins).map((plugin) => {
                    if (!("recorder" in plugin)) return null;

                    const studioPlugin = plugins[plugin.package];
                    if (!studioPlugin) return null;

                    return (
                      <button
                        aria-checked={enabledPlugins[plugin.package]}
                        className={styles.recordingToggle}
                        key={plugin.package}
                        onClick={() => togglePlugin(plugin.package)}
                        role="switch"
                        type="button"
                      >
                        {plugin.icon({ height: 24, width: 24 })}
                      </button>
                    );
                  })}
                </div>
                <table className={styles.configurationTable}>
                  <tbody>
                    {Object.values(plugins).map((plugin) => {
                      if (!("recorder" in plugin)) return null;
                      if (!enabledPlugins[plugin.package]) return null;

                      const ConfigurationComponent =
                        plugin.configurationComponent;

                      if (!ConfigurationComponent) return null;

                      return (
                        <tr key={plugin.package}>
                          <th scope="row">
                            {plugin.icon({ height: 36, width: 36 })}
                          </th>
                          <td>
                            <ConfigurationComponent />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            </TabsContent>
            <TabsContent asChild value="saved">
              <section>
                <h3>Saved</h3>
                <div className={styles.Recordings}>
                  {recordings.map((r) => (
                    <RecordingRow key={r.name} recording={r} />
                  ))}
                </div>
              </section>
            </TabsContent>
            <TabsContent asChild value="shortcuts">
              <section>
                <h3>Shortcuts</h3>
                <ShortcutsTable
                  onShortcutChange={onShortcutChange}
                  shortcuts={shortcuts}
                />
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </DockableDialog.Content>
    </DockableDialog.Dialog>
  );
}

export function RecordingRow({ recording: r }: { recording: RecordingMeta }) {
  const { value: expanded, set: setExpanded } = useToggle();

  const { plugins } = usePluginApi();
  // console.log({ plugins });

  return (
    <Collapsible.Root
      className={styles.RecordingRow}
      onOpenChange={setExpanded}
      open={expanded}
    >
      <Collapsible.Trigger className={styles.RecordingRowTrigger}>
        <span className={styles.recordingName}>{r.name}</span>
        <span className={styles.pluginIcons}>
          {r.plugins.map((p) =>
            p in plugins ? (
              <Fragment key={p}>{plugins[p].icon()}</Fragment>
            ) : null,
          )}
        </span>
        {/* <time style={{ fontSize: "12px" }}> */}
        {/*   {new Intl.DateTimeFormat("en-US").format(new Date(r.created))} */}
        {/* </time> */}
        {/**/}
        <time
          className={styles.recordingDuration}
          dateTime={formatTimeDuration(r.duration)}
        >
          {formatTime(r.duration)}
        </time>
      </Collapsible.Trigger>
      <Collapsible.Panel className={styles.RecordingRowExpand}>
        {r.plugins.map((p) => {
          const plugin = plugins[p];
          if (!plugin) return null;

          const Component = plugin.recordingComponent;
          if (!Component) return null;

          return <Component key={plugin.package} name={r.name} />;
        })}
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

type ShortcutKey = keyof NonNullable<RecordingControlProps["shortcuts"]>;

const shortcutCommands: [string, ShortcutKey][] = [
  ["Toggle panel", "toggle"],
  ["Start/Stop recording", "startStop"],
  ["Pause recording", "pause"],
  ["Discard recording", "discard"],
];

function ShortcutsTable({
  shortcuts,
  onShortcutChange,
}: {
  shortcuts?: RecordingControlProps["shortcuts"];
  onShortcutChange?: (key: ShortcutKey, value: string) => void;
}) {
  return (
    <table className={styles.shortcutsTable}>
      <thead>
        <tr>
          <th>Command</th>
          <th>Shortcut</th>
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
  if (!isMac()) return str;
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

function isMac() {
  return (
    typeof globalThis.navigator !== "undefined" &&
    navigator.platform === "MacIntel"
  );
}
