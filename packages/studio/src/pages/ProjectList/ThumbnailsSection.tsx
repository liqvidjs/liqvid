"use client";

import type { Duration } from "@liqvid/duration";
import { useProjectPath } from "@liqvid/studio-plugin-api";
import { ImagesIcon, SpinnerIcon } from "@phosphor-icons/react";
import { Effect, Exit } from "effect";
import { useEffect, useEffectEvent, useMemo, useState } from "react";

import type { ThumbsData } from "#_/api/schemas.mjs";
import { clientRuntime, LiqvidStudioApiClient } from "#_/client.mjs";
import { ASSETS_DIR, THUMBS_DIR } from "#_/conventions.mjs";
import { Button } from "#_/ui/Button.js";
import { useDialogApi } from "#_/ui/Dialog.js";
import { TimeDuration } from "#_/ui/Time.js";
import { useCommonTranslations, useTranslations } from "#_/utils/react.js";

import shareStyles from "./share.module.css";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

interface ThumbnailsSectionProps {
  duration: Duration;
  /** Selected parameter values for parameterized projects */
  selectedParams?: Record<string, string>;
}

export function ThumbnailsSection({
  duration,
  selectedParams,
}: ThumbnailsSectionProps) {
  const projectPath = useProjectPath();
  const t = useTranslations<T>().thumbs;
  const c = useCommonTranslations();
  const [thumbsData, setThumbsData] = useState<ThumbsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const { isOpen } = useDialogApi();

  const loadThumbs = useEffectEvent(async () => {
    setIsLoading(true);

    // Serialize params for use in query
    const paramsJson = selectedParams
      ? JSON.stringify(selectedParams)
      : undefined;

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

  const getSheetUrl = (colorScheme: "light" | "dark") => {
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
    <div className={shareStyles.section}>
      <div className={shareStyles.sectionActions}>
        <Button
          className={shareStyles.addButton}
          disabled={isGenerating}
          onClick={handleGenerate}
          type="button"
        >
          {isGenerating ? (
            <>
              <SpinnerIcon className={shareStyles.spinner} size={16} />{" "}
              {t.inProgress}
            </>
          ) : (
            <>
              <ImagesIcon size={16} /> {t.generate}
            </>
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className={shareStyles.loading}>
          <SpinnerIcon className={shareStyles.spinner} size={24} />
        </div>
      ) : hasNoThumbs ? (
        <p className={shareStyles.emptyMessage}>{t.empty}</p>
      ) : thumbInfo ? (
        <div className={shareStyles.thumbsPreview}>
          <div className={shareStyles.thumbsPreviewRow}>
            {/* Light thumbnail */}
            {thumbsData.light.length > 0 && (
              <div className={shareStyles.thumbsPreviewItem}>
                <span className={shareStyles.thumbsSchemeLabel}>{c.light}</span>
                <div
                  className={shareStyles.thumbsPreviewBox}
                  style={{
                    height: thumbInfo.height,
                    width: thumbInfo.width,
                  }}
                >
                  <img
                    alt="Light thumbnail"
                    src={getSheetUrl("light")}
                    style={{
                      left: -thumbInfo.col * thumbInfo.width,
                      maxWidth: "unset",
                      top: -thumbInfo.row * thumbInfo.height,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Dark thumbnail */}
            {thumbsData.dark.length > 0 && (
              <div className={shareStyles.thumbsPreviewItem}>
                <span className={shareStyles.thumbsSchemeLabel}>{c.dark}</span>
                <div
                  className={shareStyles.thumbsPreviewBox}
                  style={{
                    height: thumbInfo.height,
                    width: thumbInfo.width,
                  }}
                >
                  <img
                    alt="Dark thumbnail"
                    src={getSheetUrl("dark")}
                    style={{
                      left: -thumbInfo.col * thumbInfo.width,
                      maxWidth: "unset",
                      top: -thumbInfo.row * thumbInfo.height,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Slider controls */}
          <div className={shareStyles.thumbsSliderControls}>
            <TimeDuration
              className={shareStyles.timeDisplay}
              value={{ seconds: thumbInfo.time }}
            />
            <input
              className={shareStyles.seekSlider}
              max={100}
              min={0}
              onChange={(e) => setSliderValue(Number(e.target.value))}
              step={0.1}
              type="range"
              value={sliderValue}
            />
            <TimeDuration
              className={shareStyles.timeDisplay}
              value={duration}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
