"use client";

import type { Duration } from "@liqvid/duration";
import { formatTime } from "@liqvid/utils";
import { ImagesIcon, SpinnerIcon } from "@phosphor-icons/react";
import { Effect, Exit } from "effect";
import { useEffect, useEffectEvent, useMemo, useState } from "react";

import type { ThumbsData } from "../api/schemas.mts";
import { clientRuntime, LiqvidStudioApiClient } from "../client.mts";
import { Time, TimeDuration } from "../ui/Time";

import shareStyles from "./share.module.css";

interface ThumbnailsSectionProps {
  duration: Duration;
  projectPath: string;

  /** Whether the parent dialog is open */
  isOpen: boolean;
}

export function ThumbnailsSection({
  duration,
  isOpen,
  projectPath,
}: ThumbnailsSectionProps) {
  const [thumbsData, setThumbsData] = useState<ThumbsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);

  const loadThumbs = useEffectEvent(async () => {
    setIsLoading(true);

    const result = await clientRuntime.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;
        return yield* client.thumbs.list({ query: { projectPath } });
      }),
    );

    if (Exit.isSuccess(result)) {
      setThumbsData(result.value);
    } else {
      console.error("Failed to load thumbnails:", result.cause);
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
          payload: undefined,
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
    return `/api/liqvid/static${encodeURIComponent(
      [
        projectPath,
        ".liqvid",
        "thumbs",
        colorScheme,
        `${thumbInfo.sheetNum}.${thumbInfo.imageFormat}`,
      ].join("/"),
    )}`;
  };

  return (
    <div className={shareStyles.section}>
      <div className={shareStyles.sectionActions}>
        <button
          className={shareStyles.addButton}
          disabled={isGenerating}
          onClick={handleGenerate}
          type="button"
        >
          {isGenerating ? (
            <>
              <SpinnerIcon className={shareStyles.spinner} size={16} />{" "}
              Generating...
            </>
          ) : (
            <>
              <ImagesIcon size={16} /> Generate
            </>
          )}
        </button>
      </div>

      {isLoading ? (
        <div className={shareStyles.loading}>
          <SpinnerIcon className={shareStyles.spinner} size={24} />
        </div>
      ) : hasNoThumbs ? (
        <p className={shareStyles.emptyMessage}>
          No thumbnails yet. Click "Generate" to create thumbnail sheets.
        </p>
      ) : thumbInfo ? (
        <div className={shareStyles.thumbsPreview}>
          <div className={shareStyles.thumbsPreviewRow}>
            {/* Light thumbnail */}
            {thumbsData.light.length > 0 && (
              <div className={shareStyles.thumbsPreviewItem}>
                <span className={shareStyles.thumbsSchemeLabel}>Light</span>
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
                <span className={shareStyles.thumbsSchemeLabel}>Dark</span>
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
