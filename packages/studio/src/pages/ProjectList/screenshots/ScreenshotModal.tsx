import { Duration, type DurationLike } from "@liqvid/duration";
import { useIframeApi } from "@liqvid/iframe-api/parent/react";
import { playerApiDeclaration } from "@liqvid/player/iframe-api";
import type { ColorSchemeOption, ProjectMeta } from "@liqvid/schemas";
import { formatTime } from "@liqvid/utils";
import {
  CameraIcon,
  MoonIcon,
  SpinnerIcon,
  SunIcon,
  XIcon,
  YinYangIcon,
} from "@phosphor-icons/react";
import { Effect } from "effect";
import { useEffect, useState } from "react";

import { clientRuntime, LiqvidStudioApiClient } from "../../../client.mts";
import { useDerivedConfig } from "../../../components/DerivedConfig.tsx";
import { Button } from "../../../ui/Button.tsx";
import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "../../../ui/Dialog.tsx";
import { RadioTabs, RadioTabsItem } from "../../../ui/RadioTabs.tsx";
import { useTranslations } from "../../../utils/react.tsx";

import styles from "../../root.module.css";
import shareStyles from "../share.module.css";

import type TranslationsJson from "../.translations/en.json";

type T = typeof TranslationsJson;

interface ScreenshotModalProps {
  basePath: string;
  duration: DurationLike;
  onCaptured: () => void;
  productionServerPort: number;
  project: Omit<ProjectMeta, "duration">;
  /** Selected parameter values for parameterized projects */
  selectedParams?: Record<string, string>;
}

export function ScreenshotModal({
  basePath,
  duration,
  productionServerPort,
  onCaptured,
  project,
  selectedParams,
}: ScreenshotModalProps) {
  const t = useTranslations<T>().screenshots;

  const { renderSource } = useDerivedConfig();
  const [previewTime, setPreviewTime] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [colorScheme, setColorScheme] = useState<ColorSchemeOption>("light");

  const { aspectRatio, path: projectPath } = project;

  // NEED the trailing slash because that's how they are exported
  // TODO: this depends on the user not changing this option from the default next.config.js that we provide
  const previewPath = basePath
    ? `${basePath}/${projectPath}/`
    : `/${projectPath}/`;

  const previewUrl = (() => {
    const baseUrl =
      renderSource.screenshots === "preview"
        ? `/${projectPath}/`
        : `http://localhost:${productionServerPort}${previewPath}`;

    const searchParams = new URLSearchParams();
    if (renderSource.screenshots === "preview") {
      searchParams.set("preview", "");
    }
    if (selectedParams) {
      for (const [key, value] of Object.entries(selectedParams)) {
        searchParams.set(key, value);
      }
    }

    const queryString = searchParams.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  })();

  const { api, ref: iframeRef } = useIframeApi(playerApiDeclaration);

  // Hide controls
  useEffect(() => {
    api?.setRenderMode("screenshot").catch(console.error);
    api?.toggleCaptions(false);
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

      await clientRuntime.runPromise(
        Effect.gen(function* () {
          const client = yield* LiqvidStudioApiClient;

          yield* client.screenshots.capture({
            payload: {
              colorScheme,
              height,
              params: selectedParams,
              time: previewTime,
              width,
            },
            query: { projectPath },
          });
        }),
      );

      onCaptured();
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
        size="huge"
      >
        <div className={shareStyles.previewHeader}>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogClose className={shareStyles.closeButton}>
            <XIcon size={20} />
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
            max={Duration.inSeconds(duration) || 60}
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
          <span id="color-scheme-label">{t.colorScheme}</span>
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
          <Button
            className={styles.submitButton}
            disabled={isCapturing}
            onClick={handleCapture}
            type="button"
          >
            {isCapturing ? (
              <>
                <SpinnerIcon className={shareStyles.spinner} size={16} />{" "}
                {t.inProgress}
              </>
            ) : (
              <>
                <CameraIcon size={16} /> {t.action}
              </>
            )}
          </Button>
        </div>
      </DialogPopup>
    </DialogPortal>
  );
}
