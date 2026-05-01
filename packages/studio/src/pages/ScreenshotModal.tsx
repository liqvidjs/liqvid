import { Duration, type DurationLike } from "@liqvid/duration";
import { useIframeApi } from "@liqvid/iframe-api/parent/react";
import { playerApiDeclaration } from "@liqvid/player/iframe-api";
import type { ProjectMeta } from "@liqvid/schemas/project";
import type { ColorSchemeOption } from "@liqvid/schemas/screenshot-meta";
import { formatTime } from "@liqvid/utils";
import {
  CameraIcon,
  MoonIcon,
  SpinnerIcon,
  SunIcon,
  XIcon,
  YinYangIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { captureScreenshot } from "../client.mts";
import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "../ui/Dialog.tsx";
import { RadioTabs, RadioTabsItem } from "../ui/RadioTabs.tsx";

import styles from "./root.module.css";
import shareStyles from "./share.module.css";

interface ScreenshotModalProps {
  duration: DurationLike;
  project: Omit<ProjectMeta, "duration">;
  productionServerPort: number;
  onCaptured: () => void;
}

export function ScreenshotModal({
  duration,
  productionServerPort,
  onCaptured,
  project,
}: ScreenshotModalProps) {
  duration = Duration.from(duration);
  const [previewTime, setPreviewTime] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [colorScheme, setColorScheme] = useState<ColorSchemeOption>("light");

  const { aspectRatio, path: projectPath } = project;

  const previewUrl = `http://localhost:${productionServerPort}/${projectPath}`;

  const { api, ref: iframeRef } = useIframeApi(playerApiDeclaration);

  // Hide controls
  useEffect(() => {
    api?.toggleControls(false);
  }, [api]);

  // Seek when preview time changes
  useEffect(() => {
    api?.seekTo(previewTime).catch(console.error);
  }, [previewTime, api]);

  // Update color scheme in iframe (only for light/dark, not "both")
  useEffect(() => {
    if (colorScheme !== "both") {
      api?.setColorScheme(colorScheme).catch(console.error);
    }
  }, [colorScheme, api]);

  const handleCapture = async () => {
    setIsCapturing(true);
    try {
      // Default to 1200x630 for OpenGraph
      const width = 1200;
      const height = Math.round(
        (width * aspectRatio.height) / aspectRatio.width,
      );

      const result = await captureScreenshot({
        body: {
          colorScheme,
          height,
          time: previewTime,
          width,
        },
        search: { projectPath },
      });

      if (result.isOk) {
        onCaptured();
      } else {
        console.error("Failed to capture screenshot:", result.unwrapErr());
      }
    } catch (e) {
      console.error("Failed to capture screenshot:", e);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <DialogPortal>
      <DialogBackdrop />
      <DialogPopup
        aria-describedby={undefined}
        className={shareStyles.previewDialog}
      >
        <div className={shareStyles.previewHeader}>
          <DialogTitle>Capture Screenshot</DialogTitle>
          <DialogClose>
            <button className={shareStyles.closeButton} type="button">
              <XIcon size={20} />
            </button>
          </DialogClose>
        </div>

        <div
          className={shareStyles.previewContainer}
          style={{
            aspectRatio: `${aspectRatio.width} / ${aspectRatio.height}`,
          }}
        >
          <iframe
            className={shareStyles.previewIframe}
            ref={iframeRef}
            src={previewUrl}
            title="Video Preview"
          />
        </div>

        <div className={shareStyles.previewControls}>
          <span className={shareStyles.timeDisplay}>
            {formatTime(previewTime)}
          </span>
          <input
            className={shareStyles.seekSlider}
            max={duration.inSeconds() || 60}
            min={0}
            onChange={(e) => setPreviewTime(e.target.valueAsNumber)}
            step={0.1}
            type="range"
            value={previewTime}
          />
          <span className={shareStyles.timeDisplay}>
            {formatTime(duration)}
          </span>
        </div>

        <div className={styles.formField}>
          <span id="color-scheme-label">Color Scheme</span>
          <RadioTabs<ColorSchemeOption>
            aria-labelledby="color-scheme-label"
            onValueChange={setColorScheme}
            value={colorScheme}
          >
            <RadioTabsItem icon={SunIcon} title="Light" value="light" />
            <RadioTabsItem icon={MoonIcon} title="Dark" value="dark" />
            <RadioTabsItem icon={YinYangIcon} title="Both" value="both" />
          </RadioTabs>
        </div>

        <div className={styles.dialogActions}>
          <DialogClose>Cancel</DialogClose>
          <button
            className={styles.submitButton}
            disabled={isCapturing}
            onClick={handleCapture}
            type="button"
          >
            {isCapturing ? (
              <>
                <SpinnerIcon className={shareStyles.spinner} size={16} />{" "}
                Capturing...
              </>
            ) : (
              <>
                <CameraIcon size={16} /> Capture
              </>
            )}
          </button>
        </div>
      </DialogPopup>
    </DialogPortal>
  );
}
