import { Duration, type DurationLike } from "@liqvid/duration";
import { useIframeApi } from "@liqvid/iframe-api/parent/react";
import { playerApiDeclaration } from "@liqvid/player/iframe-api";
import type {
  AspectRatio,
  ColorSchemeOption,
  ProjectMeta,
} from "@liqvid/schemas";
import { formatTime, parseTime, timeRegexp } from "@liqvid/utils";
import {
  CameraIcon,
  MoonIcon,
  SunIcon,
  YinYangIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { Effect } from "effect";
import { useEffect, useId, useState } from "react";

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
import type { Localized, LocalizedString } from "#_/i18n/shared.mjs";
import { Button } from "#_/ui/Button.js";
import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "#_/ui/Dialog.js";
import { RadioTabs, RadioTabsItem } from "#_/ui/RadioTabs.js";
import { TimeDuration } from "#_/ui/Time.js";
import { interpolatePathParametersWithSelected } from "#_/utils/parameters-client.mjs";
import { useTranslations } from "#_/utils/react.js";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

interface ScreenshotModalProps {
  basePath: string;
  duration: DurationLike;
  onCaptured: () => void;
  project: Omit<ProjectMeta, "duration">;

  /** Selected parameter values for parameterized projects */
  selectedParams?: Readonly<Record<string, string>>;
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
    rowGap: spacing.sm,
  },

  iframe: {
    backgroundColor: colors.graySubtle,
    borderColor: colors.graySep,
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: dims.sep,
    maxHeight: "60vh",
    overflow: "hidden",
    pointerEvents: "none",
    position: "relative",
    width: "100%",
  },

  previewControls: {
    alignItems: "center",
    display: "flex",
    gap: spacing.lg,
    marginBottom: spacing.xl,
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

  timeDisplay: {
    color: colors.grayDim,
    fontFamily: typeface.mono,
    fontSize: text.md,
    minWidth: "3rem",
    textAlign: "center",
    userSelect: "none",
  },
  timeInput: {
    backgroundColor: colors.graySubtle,
    borderColor: colors.graySep,
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.grayDim,
    fontFamily: typeface.mono,
    fontSize: text.md,
    paddingBlock: spacing.xs,
    paddingInline: spacing.sm,
    textAlign: "center",
    width: "8rem",
  },
});

function formatExactTime(time: number): string {
  const milliseconds = Math.round(time * 1000);
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.floor(milliseconds / 1_000) % 60;
  const remainder = milliseconds % 1_000;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}.${String(remainder).padStart(3, "0")}`;
}

export function ScreenshotModal({
  basePath,
  duration,
  onCaptured,
  project,
  selectedParams,
}: ScreenshotModalProps) {
  const { productionServerPort } = useLiqvidConfig();
  const { screenshots: t } = useTranslations<{ screenshots: T }>();

  const { renderSource } = useDerivedConfig();
  const [previewTime, setPreviewTime] = useState(0);
  const [timeInput, setTimeInput] = useState(formatExactTime(0));
  const [isCapturing, setIsCapturing] = useState(false);
  const [colorScheme, setColorScheme] = useState<ColorSchemeOption>("both");

  const { aspectRatio, path: projectPath } = project;
  const durationSeconds = Duration.inSeconds(duration);
  const durationMilliseconds = Duration.inMilliseconds(duration);
  const interpolatedProjectPath = interpolatePathParametersWithSelected(
    projectPath,
    undefined,
    selectedParams ?? {},
  );

  // NEED the trailing slash because that's how they are exported
  // TODO: this depends on the user not changing this option from the default next.config.js that we provide
  const previewPath = basePath
    ? `${basePath}/${interpolatedProjectPath}/`
    : `/${interpolatedProjectPath}/`;

  const previewUrl = (() => {
    const baseUrl =
      renderSource.screenshots === "preview"
        ? `/${interpolatedProjectPath}/`
        : `http://localhost:${productionServerPort}${previewPath}`;

    const searchParams = new URLSearchParams();
    if (renderSource.screenshots === "preview") {
      searchParams.set("preview", "");
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
    setTimeInput(formatExactTime(previewTime));
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

  const handleTimeInputSubmit = () => {
    if (!timeRegexp.test(timeInput)) {
      return;
    }

    const parsedTime = parseTime(timeInput);
    if (parsedTime <= durationMilliseconds) {
      setPreviewTime(parsedTime / 1000);
    }
  };

  const id = useId();

  return (
    <DialogPortal>
      <DialogBackdrop />
      <DialogPopup aria-describedby={undefined} size="huge">
        <div>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogClose />
        </div>

        <Preview
          aspectRatio={aspectRatio}
          ref={iframeRef}
          src={previewUrl}
          title={t.preview}
        />

        <div sx={styles.previewControls}>
          {/** biome-ignore lint/correctness/noRestrictedElements: this is special */}
          <input
            aria-label={t.timeLabel}
            onBlur={() => setTimeInput(formatExactTime(previewTime))}
            onChange={(e) => setTimeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleTimeInputSubmit();
              }
            }}
            placeholder="mm:ss.ms"
            sx={styles.timeInput}
            type="text"
            value={timeInput}
          />
          {/** biome-ignore lint/correctness/noRestrictedElements: this is special */}
          <input
            max={durationSeconds || 60}
            min={0}
            onChange={(e) => setPreviewTime(e.target.valueAsNumber)}
            step={0.1}
            sx={styles.seekSlider}
            type="range"
            value={previewTime}
          />
          <TimeDuration
            {...stylex.props(styles.timeDisplay)}
            value={duration}
          />
        </div>

        <div sx={styles.formField}>
          <span id={id}>{t.colorScheme.label}</span>
          <RadioTabs<ColorSchemeOption>
            aria-labelledby={id}
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
            disabled={isCapturing}
            kind="primary"
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

function Preview({
  aspectRatio,
  ...props
}: Omit<React.ComponentProps<"iframe">, "className" | "style" | "title"> & {
  aspectRatio: AspectRatio;
  title: LocalizedString;
}) {
  const previewSx = stylex.props(styles.iframe);

  return (
    <iframe
      className={previewSx.className}
      style={{
        ...previewSx.style,
        aspectRatio: `${aspectRatio.width} / ${aspectRatio.height}`,
      }}
      {...props}
    />
  );
}
