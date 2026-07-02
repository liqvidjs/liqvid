"use client";

import {
  CheckCircleIcon,
  FilmStripIcon,
  FolderOpenIcon,
  MoonIcon,
  PencilSimpleIcon,
  PlayIcon,
  SpinnerIcon,
  SunIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";

import type { RenderEntry } from "../api/contract.mts";
import { listRenders, renameRender, startRender } from "../client.mts";
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

const DEFAULT_CONFIG: RenderConfig = {
  colorScheme: "light",
  height: 800,
  width: 1280,
};

const RESOLUTION_PRESETS = [
  { height: 720, label: "720p", width: 1280 },
  { height: 800, label: "800p", width: 1280 },
  { height: 1080, label: "1080p", width: 1920 },
  { height: 1440, label: "1440p", width: 2560 },
];

export function RendersSection({ isOpen, projectPath }: RendersSectionProps) {
  const [renders, setRenders] = useState<RenderEntry[]>([]);
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
  const [config, setConfig] = useState<RenderConfig>(DEFAULT_CONFIG);

  const loadRenders = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listRenders({ search: { projectPath } });
      if (result.isOk) {
        setRenders(result.unwrap());
      }
    } catch (e) {
      console.error("Failed to load renders:", e);
    } finally {
      setIsLoading(false);
    }
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
    try {
      const result = await startRender({
        body: {
          colorScheme: config.colorScheme,
          height: config.height,
          width: config.width,
        },
        search: { projectPath },
      });

      if (result.isOk) {
        await loadRenders();
      } else {
        console.error("Failed to start render:", result.unwrapErr());
      }
    } catch (e) {
      console.error("Failed to start render:", e);
    } finally {
      setIsStarting(false);
    }
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
    try {
      const result = await renameRender({
        body: {
          newName: renameValue.trim(),
          renderId: renamingRender.id,
        },
        search: { projectPath },
      });

      if (result.isOk) {
        setRenamingRender(null);
        await loadRenders();
      } else {
        console.error("Failed to rename render:", result.unwrapErr());
      }
    } catch (e) {
      console.error("Failed to rename render:", e);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleResolutionPreset = (preset: (typeof RESOLUTION_PRESETS)[0]) => {
    setConfig((c) => ({
      ...c,
      height: preset.height,
      width: preset.width,
    }));
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
                    {RESOLUTION_PRESETS.map((preset) => (
                      <button
                        className={shareStyles.presetButton}
                        data-active={
                          config.width === preset.width &&
                          config.height === preset.height
                        }
                        key={preset.label}
                        onClick={() => handleResolutionPreset(preset)}
                        type="button"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className={shareStyles.dimensionInputs}>
                    <input
                      className={shareStyles.dimensionInput}
                      min={1}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          width: Number(e.target.value) || c.width,
                        }))
                      }
                      type="number"
                      value={config.width}
                    />
                    <span className={shareStyles.dimensionSeparator}>×</span>
                    <input
                      className={shareStyles.dimensionInput}
                      min={1}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          height: Number(e.target.value) || c.height,
                        }))
                      }
                      type="number"
                      value={config.height}
                    />
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
                autoFocus
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
