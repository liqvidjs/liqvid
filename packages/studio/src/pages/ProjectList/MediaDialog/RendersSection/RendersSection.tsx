"use client";

import type { ColorScheme } from "@liqvid/color-scheme/react";
import type { AspectRatio } from "@liqvid/schemas";
import { useProjectPath } from "@liqvid/studio-plugin-api";
import {
  CheckCircleIcon,
  FilmStripIcon,
  FolderOpenIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  MoonIcon,
  PencilSimpleIcon,
  PlayIcon,
  SunIcon,
  TrashIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { Effect, Exit } from "effect";
import { useCallback, useEffect, useReducer, useState } from "react";

import type { RenderEntry } from "#_/api/schemas";
import { clientRuntime, LiqvidStudioApiClient } from "#_/client";
import { colors, dims, rounded, spacing, text } from "#_/design/tokens.stylex";
import type { PlainString } from "#_/i18n/shared";
import { openRenderInFinderAction } from "#_/pages/root-actions";
import { Button } from "#_/ui/Button";
import {
  DialogActions,
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "#_/ui/Dialog";
import { useDialogApi } from "#_/ui/dialogs-shared";
import { NumericInput } from "#_/ui/NumericInput";
import { RadioTabs, RadioTabsItem } from "#_/ui/RadioTabs";
import { Spinner } from "#_/ui/Spinner";
import { TextField } from "#_/ui/TextField";
import { Time } from "#_/ui/Time";
import {
  TranslationProvider,
  useCommonTranslations,
  useTranslations,
} from "#_/utils/react";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

export type { T as TranslationsRendersSection };

interface RendersSectionProps {
  /** Project aspect ratio (defaults to 16:9) */
  aspectRatio?: AspectRatio;

  /** Selected parameter values for parameterized projects */
  selectedParams?: Record<string, string>;
}

interface RenderConfig {
  colorScheme: ColorScheme;
  height: number;
  width: number;
}

const styles = stylex.create({
  closeButton: {
    backgroundColor: colors.transparent,
    borderStyle: "none",
    color: {
      ":hover": colors.grayNormal,
      default: colors.grayDim,
    },
    cursor: "pointer",
    padding: spacing.md,
  },
  confirmMessage: {
    color: colors.grayDim,
    fontSize: text.md,
    lineHeight: 1.5,
    marginBlock: spacing.xl,
    marginInline: spacing.zero,
  },
  dialogActions: {
    columnGap: spacing.lg,
    display: "flex",
    justifyContent: "flex-end",
    marginTop: spacing.lg,
    rowGap: spacing.lg,
  },
  dimensionInput: {
    backgroundColor: colors.grayApp,
    borderColor: {
      ":focus": colors.accentSolid,
      default: colors.graySep,
    },
    borderRadius: rounded.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.grayNormal,
    fontSize: text.md,
    outlineStyle: {
      ":focus": "none",
      default: null,
    },
    padding: spacing.md,
    textAlign: "center",
    width: "5rem",
  },
  dimensionInputs: {
    alignItems: "center",
    display: "flex",
    gap: spacing.md,
  },
  dimensionSeparator: {
    color: colors.grayDim,
    fontSize: text.base,
  },
  emptyMessage: {
    color: colors.grayDim,
    fontSize: text.md,
    padding: spacing.xl,
    textAlign: "center",
  },
  formField: {
    columnGap: spacing.lg,
    display: "flex",
    flexDirection: "column",
    rowGap: spacing.lg,
  },
  loading: {
    alignItems: "center",
    display: "flex",
    justifyContent: "center",
    padding: spacing.xl,
  },
  lockButton: {
    alignItems: "center",
    backgroundColor: {
      ":hover": colors.grayHover,
      default: colors.graySubtle,
    },
    borderColor: colors.graySep,
    borderRadius: rounded.md,
    borderStyle: "solid",
    borderWidth: dims.sep,

    color: colors.grayDim,
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    padding: spacing.sm,
    transition: "background-color 0.15s, border-color 0.15s, color 0.15s",
  },
  lockButtonActive: {
    backgroundColor: colors.accentSolid,
    borderColor: colors.accentSolid,
    color: colors.white,
  },
  presetButton: {
    backgroundColor: {
      ":hover": colors.grayHover,
      default: colors.graySubtle,
    },
    borderColor: colors.graySep,
    borderRadius: rounded.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.grayNormal,
    cursor: "pointer",
    fontSize: text.md,
    paddingBlock: spacing.sm,
    paddingInline: spacing.md,
    transition: "background-color 0.15s, border-color 0.15s",
  },
  presetButtonActive: {
    backgroundColor: colors.accentSolid,
    borderColor: colors.accentSolid,
    color: colors.white,
  },
  renderActions: {
    display: "flex",
    flexShrink: 0,
    gap: spacing.sm,
  },
  renderDetails: {
    color: colors.grayDim,
    display: "flex",
    fontSize: text.md,
    gap: spacing.lg,
  },
  renderHeader: {
    alignItems: "center",
    display: "flex",
    gap: spacing.lg,
  },
  renderInfo: {
    display: "flex",
    flex: "1",
    flexDirection: "column",
    gap: spacing.xs,
    minWidth: 0,
  },
  renderItem: {
    alignItems: "center",
    backgroundColor: colors.grayApp,
    borderColor: colors.graySep,
    borderRadius: rounded.lg,
    borderStyle: "solid",
    borderWidth: dims.sep,
    display: "flex",
    gap: spacing.lg,
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  renderList: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.md,
    listStyle: "none",
    margin: spacing.zero,
    maxHeight: "300px",
    overflowY: "auto",
    padding: spacing.zero,
  },
  renderName: {
    color: colors.grayNormal,
    fontSize: text.md,
    fontWeight: 500,
  },
  renderStatus: {
    alignItems: "center",
    color: colors.grayDim,
    display: "flex",
    fontSize: text.md,
    gap: spacing.xs,
  },
  resolutionPresets: {
    display: "flex",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionActions: {
    alignItems: "center",
    display: "flex",
    gap: spacing.md,
    justifyContent: "flex-end",
    marginBottom: spacing.lg,
  },
  statusCompleted: {
    color: colors.successSolid,
  },
  statusFailed: {
    color: colors.errorSolid,
  },
  textInput: {
    backgroundColor: colors.grayApp,
    borderColor: {
      ":focus": colors.accentSolid,
      default: colors.graySep,
    },
    borderRadius: rounded.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.grayNormal,
    fontSize: text.md,
    outlineStyle: "none",
    paddingBlock: spacing.md,
    paddingInline: spacing.md,
    width: "100%",
  },
  videoDialog: {
    maxWidth: "80vw",
    width: "auto",
  },
  videoHeader: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  videoPlayer: {
    backgroundColor: colors.black,
    borderRadius: rounded.lg,
    display: "block",
    maxHeight: "70vh",
    maxWidth: "100%",
  },
});

const DEFAULT_ASPECT_RATIO: AspectRatio = { height: 9, width: 16 };

const WIDTH_PRESETS = [640, 1280, 1920, 2560];

/**
 * Compute height from width per the aspect ratio,
 * rounded to the nearest even number (required by most video encoders).
 */
function heightFromWidth(width: number, aspectRatio: AspectRatio): number {
  return Math.round((width * aspectRatio.height) / aspectRatio.width / 2) * 2;
}

/**
 * Compute width from height per the aspect ratio,
 * rounded to the nearest even number (required by most video encoders).
 */
function widthFromHeight(height: number, aspectRatio: AspectRatio): number {
  return Math.round((height * aspectRatio.width) / aspectRatio.height / 2) * 2;
}

type RendersState = {
  config: RenderConfig;
  configOpen: boolean;
  deleteDialog: { renderId: string } | null;
  isLoading: boolean;
  isStarting: boolean;
  playingRender: RenderEntry | null;
  renameValue: string;
  renamingRender: RenderEntry | null;
  renders: readonly RenderEntry[];
};

type RendersAction =
  | { kind: "config"; value: RenderConfig }
  | { kind: "configOpen"; value: boolean }
  | { kind: "deleteDialog"; value: { renderId: string } | null }
  | { kind: "loading"; value: boolean }
  | { kind: "playing"; value: RenderEntry | null }
  | { kind: "renameOpen"; value: RenderEntry }
  | { kind: "renameValue"; value: string }
  | { kind: "renaming"; value: RenderEntry | null }
  | { kind: "renders"; value: readonly RenderEntry[] }
  | { kind: "starting"; value: boolean };

function rendersReducer(
  state: RendersState,
  action: RendersAction,
): RendersState {
  switch (action.kind) {
    case "config": {
      return { ...state, config: action.value };
    }
    case "configOpen": {
      return { ...state, configOpen: action.value };
    }
    case "deleteDialog": {
      return { ...state, deleteDialog: action.value };
    }
    case "loading": {
      return { ...state, isLoading: action.value };
    }
    case "playing": {
      return { ...state, playingRender: action.value };
    }
    case "renameOpen": {
      return {
        ...state,
        renameValue: action.value.id,
        renamingRender: action.value,
      };
    }
    case "renameValue": {
      return { ...state, renameValue: action.value };
    }
    case "renaming": {
      return { ...state, renamingRender: action.value };
    }
    case "renders": {
      return { ...state, renders: action.value };
    }
    case "starting": {
      return { ...state, isStarting: action.value };
    }
  }
}

export function RendersSection({
  aspectRatio = DEFAULT_ASPECT_RATIO,
  selectedParams,
}: RendersSectionProps) {
  const { renders: t } = useTranslations<{ renders: T }>();
  const projectPath = useProjectPath();

  const { isOpen } = useDialogApi();

  const [state, dispatch] = useReducer(
    rendersReducer,
    aspectRatio,
    (aspectRatio): RendersState => ({
      config: {
        colorScheme: "light",
        height: heightFromWidth(1280, aspectRatio),
        width: 1280,
      },
      configOpen: false,
      deleteDialog: null,
      isLoading: false,
      isStarting: false,
      playingRender: null,
      renameValue: "",
      renamingRender: null,
      renders: [],
    }),
  );
  const {
    config,
    configOpen,
    deleteDialog,
    isLoading,
    isStarting,
    playingRender,
    renameValue,
    renamingRender,
    renders,
  } = state;

  // Serialize params for use in query
  const paramsJson = JSON.stringify(selectedParams ?? {});

  const loadRenders = useCallback(async () => {
    dispatch({ kind: "loading", value: true });

    const result = await clientRuntime.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;
        return yield* client.renders.list({
          query: { params: paramsJson, projectPath },
        });
      }),
    );

    if (Exit.isSuccess(result)) {
      dispatch({ kind: "renders", value: result.value });
    } else {
      console.error("Failed to load renders:", result.cause);
    }

    dispatch({ kind: "loading", value: false });
  }, [paramsJson, projectPath]);

  useEffect(() => {
    if (isOpen) {
      loadRenders();
    }
  }, [isOpen, loadRenders]);

  // Poll for updates when there are pending/rendering jobs
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const hasActiveRenders = renders.some(
      (r) => r.meta.status === "pending" || r.meta.status === "rendering",
    );

    if (!hasActiveRenders) {
      return;
    }

    const interval = setInterval(loadRenders, 3000);
    return () => clearInterval(interval);
  }, [isOpen, renders, loadRenders]);

  const handleOpenInFinder = async (renderId: string) => {
    await openRenderInFinderAction(projectPath, renderId, selectedParams);
  };

  const handleStartRename = (render: RenderEntry) => {
    dispatch({ kind: "renameOpen", value: render });
  };

  const getStatusIcon = (status: RenderEntry["meta"]["status"]) => {
    switch (status) {
      case "pending":
      case "rendering":
        return <Spinner size={16} />;
      case "completed":
        return (
          <CheckCircleIcon
            {...stylex.props(styles.statusCompleted)}
            size={16}
            weight="fill"
          />
        );
      case "failed":
        return (
          <WarningCircleIcon
            {...stylex.props(styles.statusFailed)}
            size={16}
            weight="fill"
          />
        );
    }
  };

  const getStatusLabel = (status: RenderEntry["meta"]["status"]) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "rendering":
        return "Rendering...";
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
    }
  };

  return (
    <TranslationProvider t={t}>
      <div sx={styles.section}>
        <div sx={styles.sectionActions}>
          <DialogRoot
            onOpenChange={(open) =>
              dispatch({ kind: "configOpen", value: open })
            }
            open={configOpen}
          >
            <DialogTrigger disabled={isStarting}>
              {isStarting ? (
                <>
                  <Spinner /> {t.inProgress}
                </>
              ) : (
                <>
                  <FilmStripIcon size={16} /> {t.render}
                </>
              )}
            </DialogTrigger>
            <ConfigDialog
              {...{
                aspectRatio,
                config,
                loadRenders,
                onChangeConfig: (value: RenderConfig) =>
                  dispatch({ kind: "config", value }),
                onConfigOpenChange: (value: boolean) =>
                  dispatch({ kind: "configOpen", value }),
                onStartingChange: (value: boolean) =>
                  dispatch({ kind: "starting", value }),
                selectedParams,
              }}
            />
          </DialogRoot>
        </div>

        {isLoading && renders.length === 0 ? (
          <div sx={styles.loading}>
            <Spinner size={24} />
          </div>
        ) : renders.length === 0 ? (
          <p sx={styles.emptyMessage}>{t.empty({ label: t.render })}</p>
        ) : (
          <ul sx={styles.renderList}>
            {renders.map((render) => (
              <li key={render.id} sx={styles.renderItem}>
                <div sx={styles.renderInfo}>
                  <div sx={styles.renderHeader}>
                    <span sx={styles.renderName}>{render.id}</span>
                    <span sx={styles.renderStatus}>
                      {getStatusIcon(render.meta.status)}
                      {getStatusLabel(render.meta.status)}
                    </span>
                  </div>
                  <div sx={styles.renderDetails}>
                    <Time
                      format="date-and-time"
                      value={render.meta.createdAt}
                    />
                    <span>
                      {render.meta.width}
                      {"x"}
                      {render.meta.height}
                    </span>
                    <span>
                      {render.meta.fps}
                      {" fps"}
                    </span>
                    <span>{render.meta.colorScheme}</span>
                  </div>
                </div>
                <div sx={styles.renderActions}>
                  {render.meta.status === "completed" && (
                    <>
                      <Button
                        onClick={() =>
                          dispatch({ kind: "playing", value: render })
                        }
                        title={t.play}
                      >
                        <PlayIcon size={16} weight="fill" />
                      </Button>
                      <Button
                        onClick={() => handleOpenInFinder(render.id)}
                        title={t.openInFinder}
                      >
                        <FolderOpenIcon size={16} />
                      </Button>
                    </>
                  )}
                  <Button
                    onClick={() => handleStartRename(render)}
                    title={t.rename.trigger}
                  >
                    <PencilSimpleIcon size={16} />
                  </Button>
                  <Button
                    onClick={() =>
                      dispatch({
                        kind: "deleteDialog",
                        value: { renderId: render.id },
                      })
                    }
                    title={t.delete}
                  >
                    <TrashIcon size={16} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Video Player Dialog */}
      <DialogRoot
        onOpenChange={(open) =>
          !open && dispatch({ kind: "playing", value: null })
        }
        open={!!playingRender}
      >
        <VideoPlayerDialog {...{ playingRender }} />
      </DialogRoot>

      {/* Rename Dialog */}
      <DialogRoot
        onOpenChange={(open) =>
          !open && dispatch({ kind: "renaming", value: null })
        }
        open={!!renamingRender}
      >
        <DialogPortal>
          <DialogBackdrop forceRender />
          <RenameDialog
            {...{
              loadRenders,
              onClose: () => dispatch({ kind: "renaming", value: null }),
              onRenameValueChange: (value: string) =>
                dispatch({ kind: "renameValue", value }),
              params: paramsJson,
              renameValue,
              renamingRender,
            }}
          />
        </DialogPortal>
      </DialogRoot>

      {/* Delete Dialog */}
      <DialogRoot
        onOpenChange={(open) =>
          !open && dispatch({ kind: "deleteDialog", value: null })
        }
        open={!!deleteDialog}
      >
        <DeleteDialog
          {...{
            deleteDialog,
            loadRenders,
            onClose: () => dispatch({ kind: "deleteDialog", value: null }),
            params: paramsJson,
          }}
        />
      </DialogRoot>
    </TranslationProvider>
  );
}

function ConfigDialog({
  aspectRatio,
  config,
  loadRenders,
  onChangeConfig,
  onConfigOpenChange,
  onStartingChange,
  selectedParams,
}: {
  aspectRatio: AspectRatio;
  config: RenderConfig;
  loadRenders: () => Promise<void>;
  onChangeConfig: (config: RenderConfig) => void;
  onConfigOpenChange: (open: boolean) => void;
  onStartingChange: (starting: boolean) => void;
  selectedParams?: Record<string, string>;
}) {
  const { dialog: t } = useTranslations<T>();
  const projectPath = useProjectPath();

  const [lockAspectRatio, setLockAspectRatio] = useState(true);

  const handleStartRender = async () => {
    onStartingChange(true);
    onConfigOpenChange(false);

    const result = await clientRuntime.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;
        return yield* client.renders.start({
          payload: {
            colorScheme: config.colorScheme,
            height: config.height,
            params: selectedParams,
            width: config.width,
          },
          query: { projectPath },
        });
      }),
    );

    if (Exit.isSuccess(result)) {
      await loadRenders();
    } else {
      console.error("Failed to start render:", result.cause);
    }

    onStartingChange(false);
  };

  const handleWidthPreset = (width: number) => {
    onChangeConfig({
      ...config,
      height: lockAspectRatio
        ? heightFromWidth(width, aspectRatio)
        : config.height,
      width,
    });
  };

  const handleWidthChange = (width: number) => {
    onChangeConfig({
      ...config,
      height: lockAspectRatio
        ? heightFromWidth(width, aspectRatio)
        : config.height,
      width,
    });
  };

  const handleHeightChange = (height: number) => {
    onChangeConfig({
      ...config,
      height,
      width: lockAspectRatio
        ? widthFromHeight(height, aspectRatio)
        : config.width,
    });
  };

  const handleToggleLock = () => {
    const next = !lockAspectRatio;
    setLockAspectRatio(next);
    // When re-locking, snap the height to match the aspect ratio
    if (next) {
      onChangeConfig({
        ...config,
        height: heightFromWidth(config.width, aspectRatio),
      });
    }
  };

  return (
    <DialogPortal>
      <DialogBackdrop forceRender />
      <DialogPopup>
        <DialogTitle>{t.title}</DialogTitle>

        <div sx={styles.formField}>
          <span id="render-color-scheme-label">{t.colorScheme.label}</span>
          <RadioTabs<ColorScheme>
            aria-labelledby="render-color-scheme-label"
            onValueChange={(v) => onChangeConfig({ ...config, colorScheme: v })}
            value={config.colorScheme}
          >
            <RadioTabsItem
              icon={SunIcon}
              title={t.colorScheme.light}
              value="light"
            />
            <RadioTabsItem
              icon={MoonIcon}
              title={t.colorScheme.dark}
              value="dark"
            />
          </RadioTabs>
        </div>

        <div sx={styles.formField}>
          <span>{t.resolution}</span>
          <div sx={styles.resolutionPresets}>
            {WIDTH_PRESETS.map((width) => (
              <Button
                {...stylex.props(
                  styles.presetButton,
                  config.width === width && styles.presetButtonActive,
                )}
                key={width}
                onClick={() => handleWidthPreset(width)}
                type="button"
              >
                {width}
              </Button>
            ))}
          </div>
          <div sx={styles.dimensionInputs}>
            <NumericInput
              min={1}
              onChange={(value) => handleWidthChange(value || config.width)}
              sx={styles.dimensionInput}
              value={config.width}
            />
            <span sx={styles.dimensionSeparator}>{"×"}</span>
            <NumericInput
              min={1}
              onChange={(value) => handleHeightChange(value || config.height)}
              sx={styles.dimensionInput}
              value={config.height}
            />
            <Button
              aria-pressed={lockAspectRatio}
              {...stylex.props(
                styles.lockButton,
                lockAspectRatio && styles.lockButtonActive,
              )}
              onClick={handleToggleLock}
              title={
                lockAspectRatio ? t.unlock(aspectRatio) : t.lock(aspectRatio)
              }
              type="button"
            >
              {lockAspectRatio ? (
                <LockSimpleIcon size={16} weight="fill" />
              ) : (
                <LockSimpleOpenIcon size={16} />
              )}
            </Button>
          </div>
        </div>
        <DialogClose />

        <DialogActions>
          <Button kind="primary" onClick={handleStartRender}>
            <FilmStripIcon size={16} />
            {" " as const}
            {t.action}
          </Button>
        </DialogActions>
      </DialogPopup>
    </DialogPortal>
  );
}

function RenameDialog({
  loadRenders,
  onClose,
  onRenameValueChange,
  params,
  renameValue,
  renamingRender,
}: {
  loadRenders: () => Promise<void>;
  onClose: () => void;
  onRenameValueChange: (value: string) => void;
  params: string;
  renameValue: string;
  renamingRender: RenderEntry | null;
}) {
  const t = useTranslations<T>().rename;
  const c = useCommonTranslations();

  const projectPath = useProjectPath();

  const [isRenaming, setIsRenaming] = useState(false);

  const handleRename = async () => {
    if (!renamingRender || !renameValue.trim()) {
      return;
    }

    setIsRenaming(true);

    const result = await clientRuntime.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;
        return yield* client.renders.rename({
          payload: {
            newName: renameValue.trim(),
            renderId: renamingRender.id,
          },
          query: { params, projectPath },
        });
      }),
    );

    if (Exit.isSuccess(result)) {
      onClose();
      await loadRenders();
    } else {
      console.error("Failed to rename render:", result.cause);
    }

    setIsRenaming(false);
  };

  return (
    <DialogPopup>
      <DialogTitle>{t.title}</DialogTitle>
      <div sx={styles.formField}>
        <TextField
          label={t.name}
          onChange={onRenameValueChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isRenaming) {
              handleRename();
            }
          }}
          // autoFocus
          sx={styles.textInput}
          value={renameValue}
        />
      </div>
      <div sx={styles.dialogActions}>
        <DialogClose />
        <Button
          disabled={isRenaming || !renameValue.trim()}
          onClick={handleRename}
        >
          {isRenaming ? (
            <>
              <Spinner /> {t.inProgress}
            </>
          ) : (
            t.trigger
          )}
        </Button>
      </div>
    </DialogPopup>
  );
}

function DeleteDialog({
  deleteDialog,
  loadRenders,
  onClose,
  params,
}: {
  deleteDialog: { renderId: string } | null;
  loadRenders: () => Promise<void>;
  onClose: () => void;
  params: string;
}) {
  const t = useTranslations<T>().deleteDialog;
  const projectPath = useProjectPath();

  const performDelete = async () => {
    if (!deleteDialog) {
      return;
    }

    try {
      await clientRuntime.runPromise(
        Effect.gen(function* () {
          const client = yield* LiqvidStudioApiClient;

          yield* client.renders.delete({
            payload: { renderId: deleteDialog.renderId },
            query: { params, projectPath },
          });
        }),
      );

      onClose();
      await loadRenders();
    } catch (e) {
      console.error("Failed to delete render:", e);
    }
  };

  return (
    <DialogPortal>
      <DialogBackdrop forceRender />
      <DialogPopup>
        <DialogTitle>{t.title}</DialogTitle>
        <p sx={styles.confirmMessage}>{t.confirm}</p>
        <div sx={styles.dialogActions}>
          <DialogClose />
          <Button kind="destructive" onClick={performDelete}>
            {t.action}
          </Button>
        </div>
      </DialogPopup>
    </DialogPortal>
  );
}

function VideoPlayerDialog({
  playingRender,
}: {
  playingRender: RenderEntry | null;
}) {
  const projectPath = useProjectPath();

  const getVideoUrl = (render: RenderEntry) =>
    `/api/liqvid/static/${encodeURIComponent(`${projectPath}/.liqvid/renders/${render.id}/${render.meta.output}`)}`;

  return (
    <DialogPortal>
      <DialogBackdrop />
      <DialogPopup {...stylex.props(styles.videoDialog)}>
        <div sx={styles.videoHeader}>
          <DialogTitle>
            {playingRender?.id as PlainString | undefined}
          </DialogTitle>
          <DialogClose {...stylex.props(styles.closeButton)}>
            <XIcon size={20} />
          </DialogClose>
        </div>
        {playingRender && (
          <video
            autoPlay
            controls
            src={getVideoUrl(playingRender)}
            sx={styles.videoPlayer}
          >
            <track kind="captions" />
          </video>
        )}
      </DialogPopup>
    </DialogPortal>
  );
}
