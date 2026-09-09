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
import { useCallback, useEffect, useState } from "react";

import type { RenderEntry } from "#_/api/schemas.mjs";
import { clientRuntime, LiqvidStudioApiClient } from "#_/client.mjs";
import { Spinner } from "#_/components/Spinner.js";
import { colors, dims, radii, spacing, text } from "#_/design/tokens.stylex.js";
import type { Localized, PlainString } from "#_/i18n/shared.mjs";
import { openRenderInFinderAction } from "#_/pages/root-actions.js";
import { Button } from "#_/ui/Button.js";
import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  useDialogApi,
} from "#_/ui/Dialog.js";
import { RadioTabs, RadioTabsItem } from "#_/ui/RadioTabs.js";
import { useCommonTranslations, useTranslations } from "#_/utils/react.js";

import type TranslationsJson from "../.translations/en.json";

type T = Localized<typeof TranslationsJson>;

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
  addButton: {
    alignItems: "center",
    backgroundColor: {
      ":disabled": colors.graySubtle,
      ":hover": colors.grayHover,
      default: colors.graySubtle,
    },
    borderColor: colors.graySep,
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: {
      ":disabled": colors.grayDim,
      default: colors.grayNormal,
    },
    cursor: {
      ":disabled": "default",
      default: "pointer",
    },
    display: "flex",
    fontSize: text.md,
    gap: spacing.xs,
    paddingBlock: spacing.sm,
    paddingInline: spacing.sm,
    transition: "background-color 0.15s",
  },
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
  deleteButton: {
    alignItems: "center",
    backgroundColor: {
      ":hover": colors.deleteBtnBgHover,
      default: colors.errorSubtle,
    },
    borderColor: colors.deleteBtnBorder,
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.errorText,
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    padding: spacing.sm,
    transition: "background-color 0.15s",
  },
  deleteConfirmButton: {
    alignItems: "center",
    backgroundColor: {
      ":hover": colors.errorSolidHover,
      default: colors.errorSolid,
    },
    borderRadius: radii.md,
    borderStyle: "none",
    color: colors.white,
    columnGap: spacing.md,
    cursor: "pointer",
    display: "flex",
    fontSize: text.md,
    fontWeight: 500,
    paddingBlock: spacing.md,
    paddingInline: spacing.xl,
    rowGap: spacing.md,
    transition: "background-color 0.15s",
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
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.grayNormal,
    fontSize: text.md,
    outline: {
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
    borderRadius: radii.md,
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
    borderRadius: radii.md,
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
  renderActionButton: {
    alignItems: "center",
    backgroundColor: {
      ":hover": colors.grayHover,
      default: colors.graySubtle,
    },
    borderColor: colors.graySep,
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.grayNormal,
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    padding: spacing.sm,
    transition: "background-color 0.15s",
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
    borderRadius: radii.lg,
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
  submitButton: {
    alignItems: "center",
    backgroundColor: {
      ":hover:not(:disabled)": colors.accentSolidHover,
      default: colors.accentSolid,
    },
    borderRadius: radii.md,
    borderStyle: "none",
    color: colors.white,
    columnGap: spacing.md,
    cursor: {
      ":disabled": "not-allowed",
      default: "pointer",
    },
    display: "flex",
    fontSize: text.md,
    fontWeight: 500,
    opacity: {
      ":disabled": 0.6,
    },
    paddingBlock: spacing.md,
    paddingInline: spacing.xl,
    rowGap: spacing.md,
    transition: "background-color 0.15s",
  },
  textInput: {
    backgroundColor: colors.grayApp,
    borderColor: {
      ":focus": colors.accentSolid,
      default: colors.graySep,
    },
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.grayNormal,
    fontSize: text.md,
    outline: {
      ":focus": "none",
      default: null,
    },
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
    borderRadius: radii.lg,
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

export function RendersSection({
  aspectRatio = DEFAULT_ASPECT_RATIO,
  selectedParams,
}: RendersSectionProps) {
  const t = useTranslations<T>().renders;
  const projectPath = useProjectPath();

  const { isOpen } = useDialogApi();

  const [renders, setRenders] = useState<readonly RenderEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [playingRender, setPlayingRender] = useState<RenderEntry | null>(null);
  const [renamingRender, setRenamingRender] = useState<RenderEntry | null>(
    null,
  );
  const [renameValue, setRenameValue] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{
    renderId: string;
  } | null>(null);

  // Render config state
  const [configOpen, setConfigOpen] = useState(false);
  const [config, setConfig] = useState<RenderConfig>(() => ({
    colorScheme: "light",
    height: heightFromWidth(1280, aspectRatio),
    width: 1280,
  }));

  // Serialize params for use in query
  const paramsJson = selectedParams
    ? JSON.stringify(selectedParams)
    : undefined;

  const loadRenders = useCallback(async () => {
    setIsLoading(true);

    const result = await clientRuntime.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;
        return yield* client.renders.list({
          query: { params: paramsJson, projectPath },
        });
      }),
    );

    if (Exit.isSuccess(result)) {
      setRenders(result.value);
    } else {
      console.error("Failed to load renders:", result.cause);
    }

    setIsLoading(false);
  }, [paramsJson, projectPath]);

  useEffect(() => {
    if (isOpen) {
      loadRenders();
    }
  }, [isOpen, loadRenders]);

  // Poll for updates when there are pending/rendering jobs
  useEffect(() => {
    if (!isOpen) return;

    const hasActiveRenders = renders.some(
      (r) => r.meta.status === "pending" || r.meta.status === "rendering",
    );

    if (!hasActiveRenders) return;

    const interval = setInterval(loadRenders, 3000);
    return () => clearInterval(interval);
  }, [isOpen, renders, loadRenders]);

  const handleOpenInFinder = async (renderId: string) => {
    await openRenderInFinderAction(projectPath, renderId);
  };

  const handleStartRename = (render: RenderEntry) => {
    setRenamingRender(render);
    setRenameValue(render.id);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
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
    <>
      <div sx={styles.section}>
        <div sx={styles.sectionActions}>
          <DialogRoot onOpenChange={setConfigOpen} open={configOpen}>
            <DialogTrigger
              {...stylex.props(styles.addButton)}
              disabled={isStarting}
              type="button"
            >
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
                setConfig,
                setConfigOpen,
                setIsStarting,
              }}
            />
          </DialogRoot>
        </div>

        {isLoading && renders.length === 0 ? (
          <div sx={styles.loading}>
            <Spinner size={24} />
          </div>
        ) : renders.length === 0 ? (
          <p sx={styles.emptyMessage}>{t.empty}</p>
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
                    <span>{formatDate(render.meta.createdAt)}</span>
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
                        {...stylex.props(styles.renderActionButton)}
                        onClick={() => setPlayingRender(render)}
                        title={t.play}
                      >
                        <PlayIcon size={16} weight="fill" />
                      </Button>
                      <Button
                        {...stylex.props(styles.renderActionButton)}
                        onClick={() => handleOpenInFinder(render.id)}
                        title={t.openInFinder}
                      >
                        <FolderOpenIcon size={16} />
                      </Button>
                    </>
                  )}
                  <Button
                    {...stylex.props(styles.renderActionButton)}
                    onClick={() => handleStartRename(render)}
                    title={t.rename.trigger}
                  >
                    <PencilSimpleIcon size={16} />
                  </Button>
                  <Button
                    {...stylex.props(styles.deleteButton)}
                    onClick={() => setDeleteDialog({ renderId: render.id })}
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
        onOpenChange={(open) => !open && setPlayingRender(null)}
        open={!!playingRender}
      >
        <VideoPlayerDialog {...{ playingRender }} />
      </DialogRoot>

      {/* Rename Dialog */}
      <DialogRoot
        onOpenChange={(open) => !open && setRenamingRender(null)}
        open={!!renamingRender}
      >
        <DialogPortal>
          <DialogBackdrop />
          <RenameDialog
            {...{
              loadRenders,
              renameValue,
              renamingRender,
              setRenameValue,
              setRenamingRender,
            }}
          />
        </DialogPortal>
      </DialogRoot>

      {/* Delete Dialog */}
      <DialogRoot
        onOpenChange={(open) => !open && setDeleteDialog(null)}
        open={!!deleteDialog}
      >
        <DeleteDialog {...{ deleteDialog, loadRenders, setDeleteDialog }} />
      </DialogRoot>
    </>
  );
}

function ConfigDialog({
  aspectRatio,
  config,
  loadRenders,
  setConfig,
  setConfigOpen,
  setIsStarting,
}: {
  aspectRatio: AspectRatio;
  config: RenderConfig;
  loadRenders: () => Promise<void>;
  setConfig: React.Dispatch<React.SetStateAction<RenderConfig>>;
  setConfigOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsStarting: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const t = useTranslations<T>().renders;
  const c = useCommonTranslations();
  const projectPath = useProjectPath();

  const [lockAspectRatio, setLockAspectRatio] = useState(true);

  const handleStartRender = async () => {
    setIsStarting(true);
    setConfigOpen(false);

    const result = await clientRuntime.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;
        return yield* client.renders.start({
          payload: {
            colorScheme: config.colorScheme,
            height: config.height,
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

    setIsStarting(false);
  };

  const handleWidthPreset = (width: number) => {
    setConfig((c) => ({
      ...c,
      height: lockAspectRatio ? heightFromWidth(width, aspectRatio) : c.height,
      width,
    }));
  };

  const handleWidthChange = (width: number) => {
    setConfig((c) => ({
      ...c,
      height: lockAspectRatio ? heightFromWidth(width, aspectRatio) : c.height,
      width,
    }));
  };

  const handleHeightChange = (height: number) => {
    setConfig((c) => ({
      ...c,
      height,
      width: lockAspectRatio ? widthFromHeight(height, aspectRatio) : c.width,
    }));
  };

  const handleToggleLock = () => {
    setLockAspectRatio((locked) => {
      const next = !locked;
      // When re-locking, snap the height to match the aspect ratio
      if (next) {
        setConfig((c) => ({
          ...c,
          height: heightFromWidth(c.width, aspectRatio),
        }));
      }
      return next;
    });
  };

  return (
    <DialogPortal>
      <DialogBackdrop />
      <DialogPopup>
        <DialogTitle>{t.dialog.title}</DialogTitle>

        <div sx={styles.formField}>
          <span id="render-color-scheme-label">
            {t.dialog.colorScheme.label}
          </span>
          <RadioTabs<ColorScheme>
            aria-labelledby="render-color-scheme-label"
            onValueChange={(v) => setConfig((c) => ({ ...c, colorScheme: v }))}
            value={config.colorScheme}
          >
            <RadioTabsItem
              icon={SunIcon}
              title={t.dialog.colorScheme.light}
              value="light"
            />
            <RadioTabsItem
              icon={MoonIcon}
              title={t.dialog.colorScheme.dark}
              value="dark"
            />
          </RadioTabs>
        </div>

        <div sx={styles.formField}>
          <span>{t.dialog.resolution}</span>
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
            <input
              min={1}
              onChange={(e) =>
                handleWidthChange(Number(e.target.value) || config.width)
              }
              sx={styles.dimensionInput}
              type="number"
              value={config.width}
            />
            <span sx={styles.dimensionSeparator}>{"×"}</span>
            <input
              min={1}
              onChange={(e) =>
                handleHeightChange(Number(e.target.value) || config.height)
              }
              sx={styles.dimensionInput}
              type="number"
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
                lockAspectRatio
                  ? `Unlock aspect ratio (${aspectRatio.width}:${aspectRatio.height})`
                  : `Lock aspect ratio (${aspectRatio.width}:${aspectRatio.height})`
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

        <div sx={styles.dialogActions}>
          <DialogClose>{c.cancel}</DialogClose>
          <Button
            className={stylex.props(styles.submitButton).className}
            onClick={handleStartRender}
            type="button"
          >
            <FilmStripIcon size={16} /> {t.dialog.action}
          </Button>
        </div>
      </DialogPopup>
    </DialogPortal>
  );
}

function RenameDialog({
  loadRenders,
  renameValue,
  renamingRender,
  setRenamingRender,
  setRenameValue,
}: {
  loadRenders: () => Promise<void>;
  renameValue: string;
  renamingRender: RenderEntry | null;
  setRenameValue: React.Dispatch<React.SetStateAction<string>>;
  setRenamingRender: React.Dispatch<React.SetStateAction<RenderEntry | null>>;
}) {
  const t = useTranslations<T>().renders.rename;
  const c = useCommonTranslations();

  const projectPath = useProjectPath();

  const [isRenaming, setIsRenaming] = useState(false);

  const handleRename = async () => {
    if (!renamingRender || !renameValue.trim()) return;

    setIsRenaming(true);

    const result = await clientRuntime.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;
        return yield* client.renders.rename({
          payload: {
            newName: renameValue.trim(),
            renderId: renamingRender.id,
          },
          query: { projectPath },
        });
      }),
    );

    if (Exit.isSuccess(result)) {
      setRenamingRender(null);
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
        <label htmlFor="render-name">{t.name}</label>
        <input
          id="render-name"
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isRenaming) {
              handleRename();
            }
          }}
          // autoFocus
          sx={styles.textInput}
          type="text"
          value={renameValue}
        />
      </div>
      <div sx={styles.dialogActions}>
        <DialogClose>{c.cancel}</DialogClose>
        <Button
          className={stylex.props(styles.submitButton).className}
          disabled={isRenaming || !renameValue.trim()}
          onClick={handleRename}
          type="button"
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
  setDeleteDialog,
}: {
  deleteDialog: { renderId: string } | null;
  loadRenders: () => Promise<void>;
  setDeleteDialog: React.Dispatch<
    React.SetStateAction<{ renderId: string } | null>
  >;
}) {
  const t = useTranslations<T>().renders.deleteDialog;
  const c = useCommonTranslations();
  const projectPath = useProjectPath();

  const performDelete = async () => {
    if (!deleteDialog) return;

    try {
      await clientRuntime.runPromise(
        Effect.gen(function* () {
          const client = yield* LiqvidStudioApiClient;

          yield* client.renders.delete({
            payload: { renderId: deleteDialog.renderId },
            query: { projectPath },
          });
        }),
      );

      setDeleteDialog(null);
      await loadRenders();
    } catch (e) {
      console.error("Failed to delete render:", e);
    }
  };

  return (
    <DialogPortal>
      <DialogBackdrop />
      <DialogPopup>
        <DialogTitle>{t.title}</DialogTitle>
        <p sx={styles.confirmMessage}>{t.confirm}</p>
        <div sx={styles.dialogActions}>
          <DialogClose>{c.cancel}</DialogClose>
          <Button
            {...stylex.props(styles.deleteConfirmButton)}
            onClick={() => performDelete()}
          >
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

  const getVideoUrl = (render: RenderEntry) => {
    return `/api/liqvid/static/${encodeURIComponent(`${projectPath}/.liqvid/renders/${render.id}/${render.meta.output}`)}`;
  };

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
