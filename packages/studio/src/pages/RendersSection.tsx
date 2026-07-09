"use client";

import type { AspectRatio } from "@liqvid/schemas";
import {
  CheckCircleIcon,
  FilmStripIcon,
  FolderOpenIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  MoonIcon,
  PencilSimpleIcon,
  PlayIcon,
  SpinnerIcon,
  SunIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Effect, Exit } from "effect";
import { useCallback, useEffect, useState } from "react";

import type { RenderEntry } from "../api/schemas.mts";
import { clientRuntime, LiqvidStudioApiClient } from "../client.mts";
import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "../ui/Dialog.tsx";
import { RadioTabs, RadioTabsItem } from "../ui/RadioTabs.tsx";

import { openRenderInFinderAction } from "./root-actions.ts";

import styles from "./root.module.css";
import shareStyles from "./share.module.css";

interface RendersSectionProps {
  /** Project aspect ratio (defaults to 16:9) */
  aspectRatio?: AspectRatio;

  projectPath: string;

  /** Whether the parent dialog is open */
  isOpen: boolean;
}

type ColorScheme = "light" | "dark";

interface RenderConfig {
  colorScheme: ColorScheme;
  height: number;
  width: number;
}

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
  isOpen,
  projectPath,
}: RendersSectionProps) {
  const [renders, setRenders] = useState<readonly RenderEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [playingRender, setPlayingRender] = useState<RenderEntry | null>(null);
  const [renamingRender, setRenamingRender] = useState<RenderEntry | null>(
    null,
  );
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Render config state
  const [configOpen, setConfigOpen] = useState(false);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [config, setConfig] = useState<RenderConfig>(() => ({
    colorScheme: "light",
    height: heightFromWidth(1280, aspectRatio),
    width: 1280,
  }));

  const loadRenders = useCallback(async () => {
    setIsLoading(true);

    const result = await clientRuntime.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;
        return yield* client.renders.list({ query: { projectPath } });
      }),
    );

    if (Exit.isSuccess(result)) {
      setRenders(result.value);
    } else {
      console.error("Failed to load renders:", result.cause);
    }

    setIsLoading(false);
  }, [projectPath]);

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

  const handleOpenInFinder = async (renderId: string) => {
    await openRenderInFinderAction(projectPath, renderId);
  };

  const handleStartRename = (render: RenderEntry) => {
    setRenamingRender(render);
    setRenameValue(render.id);
  };

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getStatusIcon = (status: RenderEntry["meta"]["status"]) => {
    switch (status) {
      case "pending":
      case "rendering":
        return <SpinnerIcon className={shareStyles.spinner} size={16} />;
      case "completed":
        return (
          <CheckCircleIcon
            className={shareStyles.statusCompleted}
            size={16}
            weight="fill"
          />
        );
      case "failed":
        return (
          <WarningCircleIcon
            className={shareStyles.statusFailed}
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

  const getVideoUrl = (render: RenderEntry) => {
    return `/api/liqvid/static/${encodeURIComponent(`${projectPath}/.liqvid/renders/${render.id}/${render.meta.output}`)}`;
  };

  return (
    <>
      <div className={shareStyles.section}>
        <div className={shareStyles.sectionActions}>
          <DialogRoot onOpenChange={setConfigOpen} open={configOpen}>
            <DialogTrigger
              className={shareStyles.addButton}
              disabled={isStarting}
              type="button"
            >
              {isStarting ? (
                <>
                  <SpinnerIcon className={shareStyles.spinner} size={16} />{" "}
                  Starting...
                </>
              ) : (
                <>
                  <FilmStripIcon size={16} /> Render
                </>
              )}
            </DialogTrigger>
            <DialogPortal>
              <DialogBackdrop />
              <DialogPopup>
                <DialogTitle>Render Settings</DialogTitle>

                <div className={styles.formField}>
                  <span id="render-color-scheme-label">Color Scheme</span>
                  <RadioTabs<ColorScheme>
                    aria-labelledby="render-color-scheme-label"
                    onValueChange={(v) =>
                      setConfig((c) => ({ ...c, colorScheme: v }))
                    }
                    value={config.colorScheme}
                  >
                    <RadioTabsItem icon={SunIcon} title="Light" value="light" />
                    <RadioTabsItem icon={MoonIcon} title="Dark" value="dark" />
                  </RadioTabs>
                </div>

                <div className={styles.formField}>
                  <span>Resolution</span>
                  <div className={shareStyles.resolutionPresets}>
                    {WIDTH_PRESETS.map((width) => (
                      <button
                        className={shareStyles.presetButton}
                        data-active={config.width === width}
                        key={width}
                        onClick={() => handleWidthPreset(width)}
                        type="button"
                      >
                        {width}
                      </button>
                    ))}
                  </div>
                  <div className={shareStyles.dimensionInputs}>
                    <input
                      className={shareStyles.dimensionInput}
                      min={1}
                      onChange={(e) =>
                        handleWidthChange(
                          Number(e.target.value) || config.width,
                        )
                      }
                      type="number"
                      value={config.width}
                    />
                    <span className={shareStyles.dimensionSeparator}>×</span>
                    <input
                      className={shareStyles.dimensionInput}
                      min={1}
                      onChange={(e) =>
                        handleHeightChange(
                          Number(e.target.value) || config.height,
                        )
                      }
                      type="number"
                      value={config.height}
                    />
                    <button
                      aria-pressed={lockAspectRatio}
                      className={shareStyles.lockButton}
                      data-active={lockAspectRatio}
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
                    </button>
                  </div>
                </div>

                <div className={styles.dialogActions}>
                  <DialogClose>Cancel</DialogClose>
                  <button
                    className={styles.submitButton}
                    onClick={handleStartRender}
                    type="button"
                  >
                    <FilmStripIcon size={16} /> Start Render
                  </button>
                </div>
              </DialogPopup>
            </DialogPortal>
          </DialogRoot>
        </div>

        {isLoading && renders.length === 0 ? (
          <div className={shareStyles.loading}>
            <SpinnerIcon className={shareStyles.spinner} size={24} />
          </div>
        ) : renders.length === 0 ? (
          <p className={shareStyles.emptyMessage}>
            No renders yet. Click "Render" to create a video.
          </p>
        ) : (
          <ul className={shareStyles.renderList}>
            {renders.map((render) => (
              <li className={shareStyles.renderItem} key={render.id}>
                <div className={shareStyles.renderInfo}>
                  <div className={shareStyles.renderHeader}>
                    <span className={shareStyles.renderName}>{render.id}</span>
                    <span className={shareStyles.renderStatus}>
                      {getStatusIcon(render.meta.status)}
                      {getStatusLabel(render.meta.status)}
                    </span>
                  </div>
                  <div className={shareStyles.renderDetails}>
                    <span>{formatDate(render.meta.createdAt)}</span>
                    <span>
                      {render.meta.width}x{render.meta.height}
                    </span>
                    <span>{render.meta.fps} fps</span>
                    <span>{render.meta.colorScheme}</span>
                  </div>
                </div>
                <div className={shareStyles.renderActions}>
                  {render.meta.status === "completed" && (
                    <>
                      <button
                        className={shareStyles.renderActionButton}
                        onClick={() => setPlayingRender(render)}
                        title="Play video"
                        type="button"
                      >
                        <PlayIcon size={16} weight="fill" />
                      </button>
                      <button
                        className={shareStyles.renderActionButton}
                        onClick={() => handleOpenInFinder(render.id)}
                        title="Open in Finder"
                        type="button"
                      >
                        <FolderOpenIcon size={16} />
                      </button>
                    </>
                  )}
                  <button
                    className={shareStyles.renderActionButton}
                    onClick={() => handleStartRename(render)}
                    title="Rename"
                    type="button"
                  >
                    <PencilSimpleIcon size={16} />
                  </button>
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
        <DialogPortal>
          <DialogBackdrop className={styles.dialogOverlay} />
          <DialogPopup
            className={`${styles.dialog} ${shareStyles.videoDialog}`}
          >
            <div className={shareStyles.videoHeader}>
              <DialogTitle className={styles.dialogTitle}>
                {playingRender?.id}
              </DialogTitle>
              <DialogClose className={shareStyles.closeButton}>
                <XIcon size={20} />
              </DialogClose>
            </div>
            {playingRender && (
              <video
                autoPlay
                className={shareStyles.videoPlayer}
                controls
                src={getVideoUrl(playingRender)}
              >
                <track kind="captions" />
              </video>
            )}
          </DialogPopup>
        </DialogPortal>
      </DialogRoot>

      {/* Rename Dialog */}
      <DialogRoot
        onOpenChange={(open) => !open && setRenamingRender(null)}
        open={!!renamingRender}
      >
        <DialogPortal>
          <DialogBackdrop className={styles.dialogOverlay} />
          <DialogPopup className={styles.dialog}>
            <DialogTitle className={styles.dialogTitle}>
              Rename Render
            </DialogTitle>
            <div className={styles.formField}>
              <label htmlFor="render-name">Name</label>
              <input
                // autoFocus
                className={shareStyles.textInput}
                id="render-name"
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isRenaming) {
                    handleRename();
                  }
                }}
                type="text"
                value={renameValue}
              />
            </div>
            <div className={styles.dialogActions}>
              <DialogClose>Cancel</DialogClose>
              <button
                className={styles.submitButton}
                disabled={isRenaming || !renameValue.trim()}
                onClick={handleRename}
                type="button"
              >
                {isRenaming ? (
                  <>
                    <SpinnerIcon className={shareStyles.spinner} size={16} />{" "}
                    Renaming...
                  </>
                ) : (
                  "Rename"
                )}
              </button>
            </div>
          </DialogPopup>
        </DialogPortal>
      </DialogRoot>
    </>
  );
}
