import { usePersist, usePersistentState } from "@liqvid/hydration";
import { useRecordingApi } from "@liqvid/recording";
import type { RecordingMeta } from "@liqvid/schemas";
import {
  useIsPreview,
  usePluginApi,
  useProjectParams,
} from "@liqvid/studio-plugin-api";
import { compare } from "@liqvid/utils";
import * as stylex from "@stylexjs/stylex";
import { Effect } from "effect";
import type { RelativeDir } from "effect-paths";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { clientRuntime, LiqvidStudioApiClient } from "#_/client.mjs";
import { useStudioPrivateApi } from "#_/components/LiqvidDevToolsProvider.js";
import { useChannel } from "#_/components/WebSocketProvider.js";
import { colors, dims, radii, spacing } from "#_/design/tokens.stylex.js";
import { DockableDialog } from "#_/ui/DockableDialog.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#_/ui/Tabs.js";
import { useAsyncTranslations } from "#_/utils/react.js";

import type { RecordingControlProps } from "../RecordingControl.tsx";

import { RecordingRow } from "./RecordingRow.tsx";
import { ShortcutsTable } from "./ShortcutsTable.tsx";

import Translations from "../.translations/en.json";

const styles = stylex.create({
  configurationTable: {
    borderColor: colors.black,
    borderStyle: "solid",
    borderWidth: dims.sep,
    marginBlock: spacing.sm,
    marginInline: spacing.auto,
    width: "100%",
  },

  configurationTd: {
    padding: spacing.md,
    textAlign: "left",
  },

  configurationTh: {
    padding: spacing.md,
    textAlign: "right",
    width: "calc(36px + 8px)",
  },

  Recordings: {
    backgroundColor: colors.grayUi,
    borderColor: colors.graySep,
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    margin: `${spacing.md} 0`,
    overflow: "hidden",
  },

  recordingToggle: {
    backgroundColor: colors.grayUi,
    borderRadius: radii.md,
    cursor: "pointer",
    height: "36px",
    transition: "unset",
    width: "36px",
  },

  recordingToggleChecked: {
    backgroundColor: colors.recordingActive,
  },

  togglePlugins: {
    columnGap: "0.5em",
    display: "flex",
    rowGap: "0.5em",
  },
});

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
    <DockableDialog.Dialog>
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

                <div sx={styles.togglePlugins}>
                  {Object.values(plugins).map((plugin) => {
                    if (!("recorder" in plugin)) return null;

                    const studioPlugin = plugins[plugin.package];
                    if (!studioPlugin) return null;

                    return (
                      // biome-ignore lint/correctness/noRestrictedElements: this is ok
                      <button
                        aria-checked={enabledPlugins[plugin.package]}
                        key={plugin.package}
                        onClick={() => handleTogglePlugin(plugin.package)}
                        role="switch"
                        sx={[
                          styles.recordingToggle,
                          enabledPlugins[plugin.package] &&
                            styles.recordingToggleChecked,
                        ]}
                        type="button"
                      >
                        {plugin.icon({ height: 24, width: 24 })}
                      </button>
                    );
                  })}
                </div>
                <table sx={styles.configurationTable}>
                  <tbody>
                    {Object.values(plugins).map((plugin) => {
                      if (!("recorder" in plugin)) return null;
                      if (!enabledPlugins[plugin.package]) return null;

                      const ConfigurationComponent =
                        plugin.configurationComponent;

                      if (!ConfigurationComponent) return null;

                      return (
                        <tr key={plugin.package}>
                          <th scope="row" sx={styles.configurationTh}>
                            {plugin.icon({ height: 36, width: 36 })}
                          </th>
                          <td sx={styles.configurationTd}>
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
                <div sx={styles.Recordings}>
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
