import type { ParameterValues, RecordingMeta } from "@liqvid/schemas";
import {
  isValidRecordingName,
  type RecordingComponentProps,
  type RecordingName,
  usePluginApi,
  useProjectParams,
} from "@liqvid/studio-plugin-api";
import { ArrowsClockwiseIcon, FolderOpenIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { Effect } from "effect";
import type { RelativeDir } from "effect-paths";
import { Fragment, useCallback, useEffect, useState } from "react";

import { ServerDirectoryHelper } from "#_/assets";
import { clientRuntime, LiqvidStudioApiClient } from "#_/client";
import { useStudioPrivateApi } from "#_/components/LiqvidDevToolsProvider/index.js";
import { colors, dims, spacing, text, typeface } from "#_/design/tokens.stylex";
import { type Localized, PlainString } from "#_/i18n/shared";
import { openRecordingInFinderAction } from "#_/pages/root-actions";
import { Button } from "#_/ui/Button";
import {
  DrawerListItems,
  DrawerListPanel,
  DrawerListRoot,
  DrawerListTab,
} from "#_/ui/DrawerList";
import { TimeDuration } from "#_/ui/Time";
import { useTranslations } from "#_/utils/react";

import {
  getRecordingPluginFilesAction,
  loadRecordingPluginFileAction,
} from "../recording-actions.ts";

import { RecordingRenameForm } from "./RecordingRenameForm.tsx";
import { Subtitle } from "./ui.tsx";

import type Translations from "../.translations/en.json";

type T = Localized<typeof Translations>;

const spin = stylex.keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
  actions: {
    borderBottomColor: colors.graySep,
    borderBottomStyle: "solid",
    borderBottomWidth: dims.sep,
    columnGap: spacing.lg,
    display: "flex",
    paddingBlock: spacing.lg,
    paddingInline: spacing.lg,
    rowGap: spacing.lg,
  },

  duration: {
    color: colors.secondary,
    fontFamily: typeface.mono,
    fontSize: text.md,
    textAlign: "right",
  },

  pluginIcon: {
    backgroundColor: colors.grayDim,
    color: colors.white,
    height: "16px",
  },

  pluginIcons: {
    display: "flex",
    gap: spacing.xs,
    marginLeft: "auto",
    width: "max-content",
  },

  Recordings: {
    margin: `${spacing.md} 0`,
    overflow: "hidden",
  },

  recordingMeta: {
    alignItems: "center",
    display: "flex",
    gap: spacing.lg,
  },

  recordingName: {
    fontFamily: typeface.mono,
  },

  spinning: {
    animationDuration: "1s",
    animationIterationCount: "infinite",
    animationName: spin,
    animationTimingFunction: "linear",
  },
});

export function SavedContent({
  recordings,
  recordingsRevisionRef,
  setRecordings,
  ...props
}: {
  recordings: readonly RecordingMeta[];

  recordingsRevisionRef: { current: number };
  setRecordings: (
    action: React.SetStateAction<readonly RecordingMeta[]>,
  ) => void;
} & React.ComponentProps<"section">) {
  const {
    tabs: { saved: t },
  } = useTranslations<T>();

  const { projectPath } = useStudioPrivateApi();
  const projectParams = useProjectParams();

  return (
    <section {...props}>
      <Subtitle>{t.subtitle}</Subtitle>
      <div sx={styles.Recordings}>
        <DrawerListRoot>
          <DrawerListItems>
            {recordings.map((r) => (
              <DrawerListTab key={r.name} value={r.name}>
                {PlainString(r.name)}
              </DrawerListTab>
            ))}
          </DrawerListItems>

          {recordings.map((r) => (
            <DrawerListPanel key={r.name} value={r.name}>
              <RecordingRow
                key={r.name}
                onRename={(newName) => {
                  recordingsRevisionRef.current++;
                  setRecordings((previous) =>
                    previous.map((recording) =>
                      recording.name === r.name
                        ? { ...recording, name: newName }
                        : recording,
                    ),
                  );
                }}
                projectParams={projectParams}
                projectPath={projectPath}
                recording={r}
              />
            </DrawerListPanel>
          ))}
        </DrawerListRoot>
      </div>
    </section>
  );
}

/** @package */
export function RecordingRow({
  onRename,
  projectParams,
  projectPath,
  recording: r,
}: {
  onRename: (newName: string) => void;
  projectParams: ParameterValues;
  projectPath: RelativeDir;
  recording: RecordingMeta;
}) {
  const {
    tabs: { saved: t },
  } = useTranslations<T>();

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
              params: JSON.stringify(projectParams),
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
    <div>
      <header sx={styles.recordingMeta}>
        <span sx={styles.recordingName}>{r.name}</span>
        <TimeDuration {...stylex.props(styles.duration)} value={r.duration} />
        <span sx={styles.pluginIcons}>
          {r.plugins.map((p) =>
            Object.hasOwn(plugins, p) ? (
              <Fragment key={p}>
                {plugins[p]!.icon({
                  ...stylex.props(styles.pluginIcon),
                })}
              </Fragment>
            ) : null,
          )}
        </span>
      </header>

      <div sx={styles.actions}>
        <Button
          onClick={() =>
            void openRecordingInFinderAction(projectPath, r.name, projectParams)
          }
          title={t.openInFinder}
        >
          <FolderOpenIcon size={16} />
          {t.openInFinder}
        </Button>
        <Button
          disabled={isReprocessing}
          onClick={handleReprocess}
          title={t.rerun}
        >
          <ArrowsClockwiseIcon
            {...stylex.props(isReprocessing && styles.spinning)}
            size={16}
          />
          {isReprocessing ? t.reprocessing : t.reprocess}
        </Button>
        <RecordingRenameForm
          onRename={onRename}
          projectParams={projectParams}
          projectPath={projectPath}
          recordingName={r.name}
        />
      </div>
      {r.plugins.map((p) => {
        const plugin = plugins[p];

        if (!plugin) return null;
        if (!isValidRecordingName(r.name)) return null;

        const Component = plugin.recordingComponent;
        if (!Component) return null;

        return (
          <RecordingPluginRow
            Component={Component}
            key={plugin.package}
            name={r.name}
            pluginPackage={plugin.package}
            projectParams={projectParams}
            projectPath={projectPath}
          />
        );
      })}
    </div>
  );
}

function RecordingPluginRow({
  Component,
  name,
  pluginPackage,
  projectParams,
  projectPath,
}: {
  Component: (props: RecordingComponentProps) => React.ReactNode;
  name: RecordingName;
  pluginPackage: string;
  projectParams: ParameterValues;
  projectPath: RelativeDir;
}) {
  const [fileList, setFileList] = useState<readonly string[]>([]);

  useEffect(() => {
    let active = true;

    void getRecordingPluginFilesAction({
      pluginPackage,
      projectParams,
      projectPath,
      recordingName: name,
    })
      .then((files) => {
        if (active) setFileList(files);
      })
      .catch((error: unknown) => {
        console.error("Failed to list recording plugin files:", error);
      });

    return () => {
      active = false;
    };
  }, [name, pluginPackage, projectParams, projectPath]);

  const loadFile = useCallback(
    (filename: string) =>
      loadRecordingPluginFileAction({
        filename,
        pluginPackage,
        projectParams,
        projectPath,
        recordingName: name,
      }),
    [name, pluginPackage, projectParams, projectPath],
  );

  return (
    <Component
      files={ServerDirectoryHelper.fromFileList(fileList)}
      loadFile={loadFile}
      name={name}
    />
  );
}
