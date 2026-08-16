import { Collapsible } from "@base-ui/react/collapsible";
import { usePersist, usePersistentState } from "@liqvid/hydration";
import { Keymap } from "@liqvid/keymap";
import { useRecordingApi } from "@liqvid/recording";
import type { RecordingMeta } from "@liqvid/schemas";
import {
  useIsPreview,
  usePluginApi,
  useProjectParams,
} from "@liqvid/studio-plugin-api";
import { compare, isMac, useToggle } from "@liqvid/utils";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import { Effect } from "effect";
import type { RelativeDir } from "effect-paths";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { clientRuntime, LiqvidStudioApiClient } from "../client.mts";
import { useChannel } from "../components/WebSocketProvider.tsx";
import { useStudioPrivateApi } from "../LiqvidDevToolsProvider.tsx";
import { Button } from "../ui/Button.tsx";
import { DockableDialog } from "../ui/DockableDialog.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/Tabs.tsx";
import { TimeDuration } from "../ui/Time.tsx";
import { useAsyncTranslations } from "../utils/react.tsx";

import type { RecordingControlProps } from "./RecordingControl.tsx";

import styles from "./RecordingDialog.module.css";

import Translations from "./.translations/en.json";

type T = typeof Translations;

export interface RecordingDialogProps {
  onShortcutChange?: (
    key: keyof NonNullable<RecordingControlProps["shortcuts"]>,
    value: string,
  ) => void;
  shortcuts?: RecordingControlProps["shortcuts"];
}

const tabs = {
  configuration: "configuration",
  saved: "saved",
  shortcuts: "shortcuts",
} as const;

export function RecordingDialog({
  shortcuts,
  onShortcutChange,
}: RecordingDialogProps) {
  const t = useAsyncTranslations(Translations, "src/recording" as RelativeDir);

  const { instances, projectPath } = useStudioPrivateApi();
  const { enabledPlugins, togglePlugin } = useRecordingApi();
  const { plugins } = usePluginApi();
  const isPreview = useIsPreview();
  const projectParams = useProjectParams();

  const [recordings, setRecordings] = useState<readonly RecordingMeta[]>([]);

  const [activeTab, setActiveTab] = usePersistentState(
    {
      default: tabs.configuration,
      enum: Object.values(tabs),
      name: `liqvid:recordingDialog:activeTab:${projectPath}`,
      source: "localStorage",
      type: "string" as const,
    },
    { default: tabs.configuration, disabled: false },
  );

  // Persist enabled plugins to localStorage, partitioned by projectPath
  const [getPersistedPlugins, setPersistedPlugins] = usePersist({
    default: "[]",
    name: `liqvid:enabledPlugins:${projectPath}`,
    source: "localStorage",
    type: "string",
  });

  // Track whether we've loaded the initial state from localStorage
  const initializedRef = useRef(false);

  // Load enabled plugins from localStorage on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const stored = getPersistedPlugins();
    if (!stored) return;

    try {
      const savedPlugins = JSON.parse(stored) as string[];
      for (const pluginId of savedPlugins) {
        // Only enable if the plugin exists
        if (pluginId in plugins) {
          togglePlugin(pluginId, true);
        }
      }
    } catch {
      // Ignore invalid JSON
    }
  }, [getPersistedPlugins, plugins, togglePlugin]);

  // Handle toggling a plugin with persistence
  const handleTogglePlugin = useCallback(
    (pluginId: string) => {
      togglePlugin(pluginId);

      // Save to localStorage after toggling
      // We need to compute the new state since togglePlugin updates state async
      const currentlyEnabled = enabledPlugins[pluginId];
      const newEnabledList = Object.keys(plugins).filter((id) => {
        if (id === pluginId) {
          return !currentlyEnabled; // toggled
        }
        return enabledPlugins[id];
      });

      setPersistedPlugins(JSON.stringify(newEnabledList));
    },
    [enabledPlugins, plugins, setPersistedPlugins, togglePlugin],
  );

  useEffect(() => {
    clientRuntime.runPromise(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;

        const recordings = yield* client.recordings.list({
          query: {
            params:
              Object.keys(projectParams).length > 0
                ? JSON.stringify(projectParams)
                : undefined,
            projectPath,
          },
        });

        setRecordings(recordings);
      }),
    );
  }, [projectParams, projectPath]);

  // Live-update the list as recordings are created/updated/deleted on disk.
  useChannel(
    "recordings",
    useMemo(
      () => ({
        deleteRecording: ({ name, url }) => {
          if (url !== projectPath) return;
          setRecordings((prev) => prev.filter((r) => r.name !== name));
        },
        newRecording: ({ recording, url }) => {
          if (url !== projectPath) return;
          setRecordings((prev) => upsertRecording(prev, recording));
        },
        updateRecording: ({ recording, url }) => {
          if (url !== projectPath) return;
          setRecordings((prev) => upsertRecording(prev, recording));
        },
      }),
      [projectPath],
    ),
  );

  if (isPreview) return;

  return (
    <DockableDialog.Dialog
      className={clsx("lv-recording-dialog", styles.RecordingDialog)}
    >
      <DockableDialog.Header>{t.title}</DockableDialog.Header>
      <DockableDialog.Content>
        <div>
          <Tabs onValueChange={setActiveTab} value={activeTab}>
            <TabsList style={{ fontSize: "16px" }}>
              <TabsTrigger
                className="lv-recording-tabs"
                value={tabs.configuration}
              >
                {t.tabs.configuration.title}
              </TabsTrigger>
              <TabsTrigger className="lv-recording-tabs" value={tabs.saved}>
                {t.tabs.saved.title}
              </TabsTrigger>
              <TabsTrigger className="lv-recording-tabs" value={tabs.shortcuts}>
                {t.tabs.shortcuts.title}
              </TabsTrigger>
            </TabsList>
            <TabsContent asChild keepMounted value={tabs.configuration}>
              <section>
                <h3>{t.tabs.configuration.subtitle}</h3>

                <div className={styles.togglePlugins}>
                  {Object.values(plugins).map((plugin) => {
                    if (!("recorder" in plugin)) return null;

                    const studioPlugin = plugins[plugin.package];
                    if (!studioPlugin) return null;

                    return (
                      // biome-ignore lint/correctness/noRestrictedElements: this is ok
                      <button
                        aria-checked={enabledPlugins[plugin.package]}
                        className={styles.recordingToggle}
                        key={plugin.package}
                        onClick={() => handleTogglePlugin(plugin.package)}
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
                            <ConfigurationComponent
                              instances={instances[plugin.package] ?? new Set()}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            </TabsContent>
            <TabsContent asChild value={tabs.saved}>
              <section>
                <h3>{t.tabs.saved.subtitle}</h3>
                <div className={styles.Recordings}>
                  {recordings.map((r) => (
                    <RecordingRow
                      key={r.name}
                      projectParams={projectParams}
                      projectPath={projectPath}
                      recording={r}
                    />
                  ))}
                </div>
              </section>
            </TabsContent>
            <TabsContent asChild value={tabs.shortcuts}>
              <section>
                <h3>{t.tabs.shortcuts.title}</h3>
                <ShortcutsTable
                  onShortcutChange={onShortcutChange}
                  shortcuts={shortcuts}
                  t={t.tabs.shortcuts}
                />
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </DockableDialog.Content>
    </DockableDialog.Dialog>
  );
}

export function RecordingRow({
  projectParams,
  projectPath,
  recording: r,
}: {
  projectParams: Record<string, string>;
  projectPath: RelativeDir;
  recording: RecordingMeta;
}) {
  const { value: expanded, set: setExpanded } = useToggle();
  const [isReprocessing, setIsReprocessing] = useState(false);

  const { plugins } = usePluginApi();

  const handleReprocess = useCallback(() => {
    setIsReprocessing(true);
    clientRuntime
      .runPromise(
        Effect.gen(function* () {
          const client = yield* LiqvidStudioApiClient;

          yield* client.recordings.reprocess({
            payload: { recordingName: r.name },
            query: {
              params:
                Object.keys(projectParams).length > 0
                  ? JSON.stringify(projectParams)
                  : undefined,
              projectPath,
            },
          });
        }),
      )
      .finally(() => {
        setIsReprocessing(false);
      });
  }, [projectParams, projectPath, r.name]);

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
            Object.hasOwn(plugins, p) ? (
              <Fragment key={p}>{plugins[p]!.icon()}</Fragment>
            ) : null,
          )}
        </span>
        {/* <time style={{ fontSize: "12px" }}> */}
        {/*   {new Intl.DateTimeFormat("en-US").format(new Date(r.created))} */}
        {/* </time> */}
        {/**/}
        <TimeDuration className={styles.recordingDuration} value={r.duration} />
      </Collapsible.Trigger>
      <Collapsible.Panel className={styles.RecordingRowExpand}>
        <div className={styles.recordingActions}>
          <Button
            className={styles.reprocessButton}
            disabled={isReprocessing}
            onClick={handleReprocess}
            title="Re-run post-processing plugins"
          >
            <ArrowsClockwiseIcon
              className={isReprocessing ? styles.spinning : undefined}
              size={16}
            />
            {isReprocessing ? "Reprocessing..." : "Reprocess"}
          </Button>
        </div>
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

/**
 * Insert or replace a recording (keyed by `name`), keeping the list sorted by
 * creation time to match the server's `list` ordering.
 */
function upsertRecording(
  recordings: readonly RecordingMeta[],
  recording: RecordingMeta,
): RecordingMeta[] {
  const next = recordings.filter((r) => r.name !== recording.name);
  next.push(recording);
  next.sort((a, b) => compare(a.created, b.created));
  return next;
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
