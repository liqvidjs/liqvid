import { Duration, type DurationLike } from "@liqvid/duration";
import { useIframeApi } from "@liqvid/iframe-api/parent/react";
import { playerApiDeclaration } from "@liqvid/player/iframe-api";
import type { ColorSchemeOption, ProjectMeta } from "@liqvid/schemas";
import { formatTime } from "@liqvid/utils";
import {
  CameraIcon,
  MoonIcon,
  SunIcon,
  XIcon,
  YinYangIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { Effect } from "effect";
import { useEffect, useState } from "react";

import { clientRuntime, LiqvidStudioApiClient } from "#_/client.mjs";
import { useDerivedConfig } from "#_/components/DerivedConfig.js";
import { Spinner } from "#_/components/Spinner.js";
import { useLiqvidConfig } from "#_/contexts/liqvid-config.js";
import {
  colors,
  dims,
  radii,
  spacing,
  text,
  typeface,
} from "#_/design/tokens.stylex.js";
import type { Localized } from "#_/i18n/shared.mjs";
import { Button } from "#_/ui/Button.js";
import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "#_/ui/Dialog.js";
import { RadioTabs, RadioTabsItem } from "#_/ui/RadioTabs.js";
import { useTranslations } from "#_/utils/react.js";

import type TranslationsJson from "../.translations/en.json";

type T = Localized<typeof TranslationsJson>;

interface ScreenshotModalProps {
  basePath: string;
  duration: DurationLike;
  onCaptured: () => void;
  project: Omit<ProjectMeta, "duration">;

  /** Selected parameter values for parameterized projects */
  selectedParams?: Record<string, string>;
}

const styles = stylex.create({
  dialogActions: {
    columnGap: spacing.lg,
    display: "flex",
    justifyContent: "flex-end",
    marginTop: spacing.lg,
    rowGap: spacing.lg,
  },
  formField: {
    columnGap: spacing.lg,
    display: "flex",
    flexDirection: "column",
    rowGap: spacing.lg,
  },
  previewContainer: {
    backgroundColor: colors.graySubtle,
    borderColor: colors.graySep,
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: dims.sep,
    maxHeight: "60vh",
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },

  previewControls: {
    alignItems: "center",
    display: "flex",
    gap: spacing.lg,
    marginTop: spacing.xl,
    paddingBlock: spacing.zero,
    paddingInline: spacing.md,
  },

  seekSlider: {
    appearance: "none",
    backgroundColor: colors.graySep,
    borderRadius: radii.md,
    flex: "1",
    height: "6px",
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

  timeDisplay: {
    color: colors.grayDim,
    fontFamily: typeface.mono,
    fontSize: text.md,
    minWidth: "3rem",
    textAlign: "center",
    userSelect: "none",
  },
});

export function ScreenshotModal({
  basePath,
  duration,
  onCaptured,
  project,
  selectedParams,
}: ScreenshotModalProps) {
  const { productionServerPort } = useLiqvidConfig();
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
      <DialogPopup aria-describedby={undefined} size="huge">
        <div>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogClose>
            <XIcon size={20} />
          </DialogClose>
        </div>

        {(() => {
          const previewSx = stylex.props(styles.previewContainer);
          return (
            <div
              className={previewSx.className}
              style={{
                ...previewSx.style,
                aspectRatio: `${aspectRatio.width} / ${aspectRatio.height}`,
              }}
            >
              <iframe ref={iframeRef} src={previewUrl} title="Video Preview" />
            </div>
          );
        })()}

        <div sx={styles.previewControls}>
          <span sx={styles.timeDisplay}>{formatTime(previewTime)}</span>
          <input
            max={Duration.inSeconds(duration) || 60}
            min={0}
            onChange={(e) => setPreviewTime(e.target.valueAsNumber)}
            step={0.1}
            sx={styles.seekSlider}
            type="range"
            value={previewTime}
          />
          <span sx={styles.timeDisplay}>{formatTime(duration)}</span>
        </div>

        <div sx={styles.formField}>
          <span id="color-scheme-label">{t.colorScheme.label}</span>
          <RadioTabs<ColorSchemeOption>
            aria-labelledby="color-scheme-label"
            onValueChange={setColorScheme}
            value={colorScheme}
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
            <RadioTabsItem
              icon={YinYangIcon}
              title={t.colorScheme.both}
              value="both"
            />
          </RadioTabs>
        </div>

        <div sx={styles.dialogActions}>
          <Button
            className={stylex.props(styles.submitButton).className}
            disabled={isCapturing}
            onClick={handleCapture}
            type="button"
          >
            {isCapturing ? (
              <>
                <Spinner size={16} /> {t.inProgress}
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
