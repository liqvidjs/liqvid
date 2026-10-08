import { usePersist, usePersistentState } from "@liqvid/hydration";
import { useRecordingApi } from "@liqvid/recording";
import type { ParameterValues, RecordingMeta } from "@liqvid/schemas";
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

import { clientRuntime, LiqvidStudioApiClient } from "#_/client";
import { useStudioPrivateApi } from "#_/components/LiqvidDevToolsProvider/index.js";
import { useChannel } from "#_/components/WebSocketProvider";
import { colors, dims, rounded, spacing } from "#_/design/tokens.stylex";
import { DockableDialog } from "#_/ui/DockableDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#_/ui/Tabs";
import { TranslationProvider, useAsyncTranslations } from "#_/utils/react";

import type { RecordingControlProps } from "../RecordingControl.tsx";

import { SavedContent } from "./RecordingRow.tsx";
import { ShortcutsTable } from "./ShortcutsTable.tsx";
import { Subtitle } from "./ui.tsx";

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

  recordingToggle: {
    alignItems: "center",
    backgroundColor: colors.grayDim,
    borderRadius: rounded.md,
    cursor: "pointer",
    display: "inline-flex",
    height: "36px",
    justifyContent: "center",
    textAlign: "center",
    transition: "unset",
    width: "36px",
  },

  recordingToggleChecked: {
    backgroundColor: colors.recordingPluginActive,
  },

  togglePlugins: {
    columnGap: spacing.lg,
    display: "flex",
    rowGap: spacing.lg,
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
  const recordingsRevisionRef = useRef(0);

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
    let active = true;
    const revisionAtStart = recordingsRevisionRef.current;

    clientRuntime.runPromise(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;

        const recordings = yield* client.recordings.list({
          query: {
            params: JSON.stringify(projectParams),
            projectPath,
          },
        });

        if (active && recordingsRevisionRef.current === revisionAtStart) {
          setRecordings(recordings);
        }
      }),
    );

    return () => {
      active = false;
    };
  }, [projectParams, projectPath]);

  useRecordingEvents({
    projectParams,
    projectPath,
    recordingsRevisionRef,
    setRecordings,
  });

  if (isPreview) return;

  return (
    <TranslationProvider t={t}>
      <DockableDialog.Dialog>
        <DockableDialog.Header>
          {t.title}
          <DockableDialog.Close />
        </DockableDialog.Header>
        <DockableDialog.Content>
          <div>
            <Tabs onValueChange={setActiveTab} size="small" value={activeTab}>
              <TabsList style={{ fontSize: "16px" }}>
                <TabsTrigger value={tabs.configuration}>
                  {t.tabs.configuration.title}
                </TabsTrigger>
                <TabsTrigger value={tabs.saved}>
                  {t.tabs.saved.title}
                </TabsTrigger>
                <TabsTrigger value={tabs.shortcuts}>
                  {t.tabs.shortcuts.title}
                </TabsTrigger>
              </TabsList>
              <TabsContent asChild keepMounted value={tabs.configuration}>
                <section>
                  <Subtitle>{t.tabs.configuration.subtitle}</Subtitle>

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
                                instances={
                                  instances[plugin.package] ?? new Set()
                                }
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
                <SavedContent
                  {...{ recordings, recordingsRevisionRef, setRecordings }}
                />
              </TabsContent>
              <TabsContent asChild value={tabs.shortcuts}>
                <section>
                  <Subtitle>{t.tabs.shortcuts.title}</Subtitle>
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
    </TranslationProvider>
  );
}

function useRecordingEvents({
  projectParams,
  projectPath,
  recordingsRevisionRef,
  setRecordings,
}: {
  projectParams: ParameterValues;
  projectPath: RelativeDir;
  recordingsRevisionRef: { current: number };
  setRecordings: (
    action: React.SetStateAction<readonly RecordingMeta[]>,
  ) => void;
}): void {
  useChannel(
    "recordings",
    useMemo(
      () => ({
        deleteRecording: (event) => {
          if (!isCurrentProject(event, { projectParams, projectPath })) return;
          recordingsRevisionRef.current++;
          setRecordings((prev) => prev.filter((r) => r.name !== event.name));
        },
        newRecording: (event) => {
          if (!isCurrentProject(event, { projectParams, projectPath })) return;
          recordingsRevisionRef.current++;
          setRecordings((prev) => upsertRecording(prev, event.recording));
        },
        updateRecording: (event) => {
          if (!isCurrentProject(event, { projectParams, projectPath })) return;
          recordingsRevisionRef.current++;
          setRecordings((prev) => upsertRecording(prev, event.recording));
        },
      }),
      [projectParams, projectPath, recordingsRevisionRef, setRecordings],
    ),
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

function isCurrentProject(
  event: { projectParams: ParameterValues; projectPath: string },
  current: { projectParams: ParameterValues; projectPath: string },
): boolean {
  return (
    event.projectPath === current.projectPath &&
    Object.keys(event.projectParams).length ===
      Object.keys(current.projectParams).length &&
    Object.entries(event.projectParams).every(
      ([key, value]) => current.projectParams[key] === value,
    )
  );
}
