import { Duration, type DurationLike } from "@liqvid/duration";
import { useIframeApi } from "@liqvid/iframe-api/parent/react";
import { playerApiDeclaration } from "@liqvid/player/iframe-api";
import type {
  AspectRatio,
  ColorSchemeOption,
  ParameterValues,
  ProjectMeta,
} from "@liqvid/schemas";
import { formatTimeMs, isDurationString, parseTime$ } from "@liqvid/utils";
import {
  CameraIcon,
  MoonIcon,
  SunIcon,
  YinYangIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { Effect } from "effect";
import { useEffect, useId, useState } from "react";

import { clientRuntime, LiqvidStudioApiClient } from "#_/client";
import { useDerivedConfig } from "#_/components/DerivedConfig.js";
import { useLiqvidConfig } from "#_/contexts/liqvid-config";
import { getPreviewServerOrigin } from "#_/contexts/preview-server-config";
import {
  colors,
  dims,
  rounded,
  spacing,
  text,
  typeface,
} from "#_/design/tokens.stylex";
import type { Localized, LocalizedString } from "#_/i18n/shared";
import { Button } from "#_/ui/Button";
import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "#_/ui/Dialog";
import { RadioTabs, RadioTabsItem } from "#_/ui/RadioTabs";
import { Spinner } from "#_/ui/Spinner";
import { TimeDuration } from "#_/ui/Time";
import { interpolatePathParametersWithSelected } from "#_/utils/parameters-client";
import { useTranslations } from "#_/utils/react";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

interface ScreenshotModalProps {
  basePath: string;
  duration: DurationLike;
  onCaptured: (params: ParameterValues) => void;
  project: Omit<ProjectMeta, "duration">;

  /** Selected parameter values for parameterized projects */
  selectedParams?: ParameterValues;
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
    borderRadius: rounded.lg,
    borderStyle: "solid",
    borderWidth: dims.sep,
    maxHeight: "60vh",
    overflow: "hidden",
    pointerEvents: "none",
    position: "relative",
    width: "100%",
  },

  popup: { maxWidth: "unset", width: "60vw" },

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
    borderRadius: rounded.md,
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
    borderRadius: rounded.md,
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
  const [previewTime, setPreviewTime] = useState(Duration.zero);
  const [timeInput, setTimeInput] = useState(formatTimeMs(0));
  const [isCapturing, setIsCapturing] = useState(false);
  const [colorScheme, setColorScheme] = useState<ColorSchemeOption>("both");

  const { aspectRatio, path: projectPath } = project;
  const durationSeconds = Duration.inSeconds(duration);
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
    api?.seekTo(previewTime.inSeconds()).catch(console.error);
    setTimeInput(formatTimeMs(previewTime));
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
              time: previewTime.inSeconds(),
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
    if (!isDurationString(timeInput)) {
      return;
    }

    const parsedTime = parseTime$(timeInput);
    if (parsedTime.lessThanOrEqual(duration)) {
      setPreviewTime(parsedTime);
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
            onBlur={() => setTimeInput(formatTimeMs(previewTime))}
            onChange={(e) => {
              const { value } = e.target;
              if (isDurationString(value)) {
                setTimeInput(value);
              }
            }}
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
            onChange={(e) =>
              setPreviewTime(Duration.from({ seconds: e.target.valueAsNumber }))
            }
            step={0.1}
            sx={styles.seekSlider}
            type="range"
            value={previewTime.inSeconds()}
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
          <Button disabled={isCapturing} kind="primary" onClick={handleCapture}>
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
