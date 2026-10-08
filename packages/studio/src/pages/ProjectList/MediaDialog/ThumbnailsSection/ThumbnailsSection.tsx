"use client";

import type { ColorScheme } from "@liqvid/color-scheme/react";
import type { Duration } from "@liqvid/duration";
import { useProjectPath } from "@liqvid/studio-plugin-api";
import { ImagesIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { Effect, Exit } from "effect";
import { useEffect, useEffectEvent, useMemo, useState } from "react";

import type { ThumbsData } from "#_/api/schemas";
import { clientRuntime, LiqvidStudioApiClient } from "#_/client";
import { ASSETS_DIR, THUMBS_DIR } from "#_/conventions";
import {
  colors,
  dims,
  rounded,
  spacing,
  text,
  typeface,
} from "#_/design/tokens.stylex";
import { Button } from "#_/ui/Button";
import { useDialogApi } from "#_/ui/dialogs-shared";
import { Range } from "#_/ui/Range";
import { Spinner } from "#_/ui/Spinner";
import { TimeDuration } from "#_/ui/Time";
import { useCommonTranslations, useTranslations } from "#_/utils/react";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

export type { T as TranslationsThumbnailsSection };

interface ThumbnailsSectionProps {
  duration: Duration;
  /** Selected parameter values for parameterized projects */
  selectedParams?: Record<string, string>;
}

const styles = stylex.create({
  emptyMessage: {
    color: colors.grayDim,
    fontSize: text.md,
    padding: spacing.xl,
    textAlign: "center",
  },
  loading: {
    alignItems: "center",
    display: "flex",
    justifyContent: "center",
    padding: spacing.xl,
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
  seekSlider: {
    appearance: "none",
    backgroundColor: colors.graySep,
    borderRadius: rounded.md,
    flex: "1",
    height: "6px",
  },
  thumbsPreview: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xl,
  },
  thumbsPreviewBox: {
    backgroundColor: colors.graySubtle,
    borderColor: colors.graySep,
    borderRadius: rounded.lg,
    borderStyle: "solid",
    borderWidth: dims.sep,
    overflow: "hidden",
    position: "relative",
  },
  thumbsPreviewBoxImg: {
    position: "absolute",
  },
  thumbsPreviewItem: {
    alignItems: "center",
    display: "flex",
    flexDirection: "column",
    gap: spacing.md,
  },
  thumbsPreviewRow: {
    display: "flex",
    gap: spacing.lg,
    justifyContent: "center",
  },
  thumbsSchemeLabel: {
    color: colors.grayDim,
    fontSize: text.md,
    fontWeight: 500,
    textTransform: "uppercase",
  },
  thumbsSliderControls: {
    alignItems: "center",
    display: "flex",
    gap: spacing.lg,
    paddingBlock: spacing.zero,
    paddingInline: spacing.md,
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

/** @pacakge */
export function ThumbnailsSection({
  duration,
  selectedParams,
}: ThumbnailsSectionProps) {
  const projectPath = useProjectPath();
  const { thumbs: t } = useTranslations<{ thumbs: T }>();
  const c = useCommonTranslations();
  const [thumbsData, setThumbsData] = useState<ThumbsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const { isOpen } = useDialogApi();

  const loadThumbs = useEffectEvent(async () => {
    setIsLoading(true);

    // Serialize params for use in query
    const paramsJson = JSON.stringify(selectedParams ?? {});

    const result = await clientRuntime.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;
        return yield* client.thumbs.list({
          query: { params: paramsJson, projectPath },
        });
      }),
    );

    if (Exit.isSuccess(result)) {
      setThumbsData(result.value);
    } else {
      if (
        result.cause.reasons.every(
          (reason) =>
            reason._tag === "Fail" && reason.error._tag === "NotFound",
        )
      ) {
        // this is ok
      } else {
        console.error("Failed to load thumbnails:", result.cause);
      }
    }
    setIsLoading(false);
  });

  useEffect(() => {
    if (isOpen) {
      loadThumbs();
    }
  }, [isOpen]);

  const handleGenerate = useEffectEvent(async () => {
    setIsGenerating(true);
    const result = await clientRuntime.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;

        yield* client.thumbs.generate({
          payload: { params: selectedParams },
          query: { projectPath },
        });
      }),
    );

    if (Exit.isSuccess(result)) {
      await loadThumbs();
    } else {
      console.error("Failed to generate thumbnails:", result.cause);
    }

    setIsGenerating(false);
  });

  const hasNoThumbs = thumbsData === null;
  const job = thumbsData?.job;

  // Calculate thumbnail display info based on ThumbnailBox strategy
  const thumbInfo = useMemo(() => {
    if (!job) return null;

    const cols = job.cols;
    const rows = job.rows ?? 5;
    const frequency = job.frequency;
    const width = job.width ?? 160;
    const height = job.height ?? 90;
    const count = cols * rows;
    const imageFormat = job.imageFormat;

    // Convert slider value (0-100) to time
    const time = (sliderValue / 100) * duration.inSeconds();

    const markerNum = Math.floor(time / frequency);
    const sheetNum = Math.floor(markerNum / count);
    const markerNumOnSheet = markerNum % count;

    const row = Math.floor(markerNumOnSheet / cols);
    const col = markerNumOnSheet % cols;

    return {
      col,
      height,
      imageFormat,
      row,
      sheetNum,
      time,
      width,
    };
  }, [job, sliderValue, duration]);

  const getSheetUrl = (colorScheme: ColorScheme) => {
    if (!thumbInfo) return "";

    // Build the path segments
    const pathSegments: string[] = [projectPath, ASSETS_DIR];

    // For parameterized projects, add the parameter subpath
    // Extract param names from path (e.g., `/[lang]/[locale]/foo` → ["lang", "locale"])
    // and build subpath from values (e.g., { lang: "en", locale: "US" } → "en/US")
    if (selectedParams) {
      const paramNames = Array.from(
        projectPath.matchAll(/\[([^\]]+)\]/g),
        (m) => m[1]!,
      );
      if (paramNames.length > 0) {
        const subpath = paramNames
          .map((name) => selectedParams[name] ?? "")
          .join("/");
        pathSegments.push(subpath);
      }
    }

    pathSegments.push(
      THUMBS_DIR,
      colorScheme,
      `${thumbInfo.sheetNum}.${thumbInfo.imageFormat}`,
    );

    return `/api/liqvid/static${encodeURIComponent(pathSegments.join("/"))}`;
  };

  return (
    <div sx={styles.section}>
      <div sx={styles.sectionActions}>
        <Button disabled={isGenerating} onClick={handleGenerate}>
          {isGenerating ? (
            <>
              <Spinner size={16} /> {t.inProgress}
            </>
          ) : (
            <>
              <ImagesIcon size={16} /> {t.generate}
            </>
          )}
        </Button>
      </div>

      {isLoading ? (
        <div sx={[styles.loading]}>
          <Spinner size={24} />
        </div>
      ) : hasNoThumbs ? (
        <p sx={styles.emptyMessage}>{t.empty}</p>
      ) : thumbInfo ? (
        <div sx={styles.thumbsPreview}>
          <div sx={styles.thumbsPreviewRow}>
            {/* Light thumbnail */}
            {thumbsData.light.length > 0 && (
              <div sx={styles.thumbsPreviewItem}>
                <span sx={styles.thumbsSchemeLabel}>{c.light}</span>
                {(() => {
                  const boxSx = stylex.props(styles.thumbsPreviewBox);
                  const imgSx = stylex.props(styles.thumbsPreviewBoxImg);

                  return (
                    <div
                      className={boxSx.className}
                      style={{
                        ...boxSx.style,
                        height: thumbInfo.height,
                        width: thumbInfo.width,
                      }}
                    >
                      <img
                        alt={t.altLight}
                        className={imgSx.className}
                        src={getSheetUrl("light")}
                        style={{
                          ...imgSx.style,
                          left: -thumbInfo.col * thumbInfo.width,
                          maxWidth: "unset",
                          top: -thumbInfo.row * thumbInfo.height,
                        }}
                      />
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Dark thumbnail */}
            {thumbsData.dark.length > 0 && (
              <div sx={styles.thumbsPreviewItem}>
                <span sx={styles.thumbsSchemeLabel}>{c.dark}</span>
                {(() => {
                  const boxSx = stylex.props(styles.thumbsPreviewBox);
                  const imgSx = stylex.props(styles.thumbsPreviewBoxImg);
                  return (
                    <div
                      className={boxSx.className}
                      style={{
                        ...boxSx.style,
                        height: thumbInfo.height,
                        width: thumbInfo.width,
                      }}
                    >
                      <img
                        alt={t.altDark}
                        className={imgSx.className}
                        src={getSheetUrl("dark")}
                        style={{
                          ...imgSx.style,
                          left: -thumbInfo.col * thumbInfo.width,
                          maxWidth: "unset",
                          top: -thumbInfo.row * thumbInfo.height,
                        }}
                      />
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Slider controls */}
          <div sx={styles.thumbsSliderControls}>
            <TimeDuration
              {...stylex.props(styles.timeDisplay)}
              value={{ seconds: thumbInfo.time }}
            />
            <Range
              max={100}
              min={0}
              onChange={setSliderValue}
              step={0.1}
              {...stylex.props(styles.seekSlider)}
              value={sliderValue}
            />
            <TimeDuration
              {...stylex.props(styles.timeDisplay)}
              value={duration}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
