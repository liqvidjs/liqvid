"use client";

import { ImagesIcon, SpinnerIcon } from "@phosphor-icons/react";
import { useEffect, useEffectEvent, useState } from "react";

import { generateThumbs, listThumbs } from "../client.mts";

import shareStyles from "./share.module.css";

interface ThumbnailsSectionProps {
  projectPath: string;
  /** Whether the parent dialog is open */
  isOpen: boolean;
}

interface ThumbSheets {
  dark: string[];
  light: string[];
}

export function ThumbnailsSection({
  isOpen,
  projectPath,
}: ThumbnailsSectionProps) {
  const [thumbSheets, setThumbSheets] = useState<ThumbSheets>({
    dark: [],
    light: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadThumbs = useEffectEvent(async () => {
    setIsLoading(true);
    try {
      const result = await listThumbs({ search: { projectPath } });
      if (result.isOk) {
        const { dark, light } = result.unwrap();
        setThumbSheets({ dark, light });
      }
    } catch (e) {
      console.error("Failed to load thumbnails:", e);
    } finally {
      setIsLoading(false);
    }
  });

  useEffect(() => {
    if (isOpen) {
      loadThumbs();
    }
  }, [isOpen]);

  const handleGenerate = useEffectEvent(async () => {
    setIsGenerating(true);
    try {
      const result = await generateThumbs({
        body: {},
        search: { projectPath },
      });

      if (result.isOk) {
        await loadThumbs();
      } else {
        console.error("Failed to generate thumbnails:", result.unwrapErr());
      }
    } catch (e) {
      console.error("Failed to generate thumbnails:", e);
    } finally {
      setIsGenerating(false);
    }
  });

  const hasNoThumbs =
    thumbSheets.light.length === 0 && thumbSheets.dark.length === 0;

  return (
    <div className={shareStyles.section}>
      <div className={shareStyles.sectionHeader}>
        <h3>Thumbnails</h3>
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
      ) : (
        <div className={shareStyles.thumbsContainer}>
          {thumbSheets.light.length > 0 && (
            <div className={shareStyles.thumbsScheme}>
              <span className={shareStyles.thumbsSchemeLabel}>Light</span>
              <div className={shareStyles.thumbsGrid}>
                {thumbSheets.light.map((sheet) => (
                  <img
                    alt={`Light thumbnail sheet ${sheet}`}
                    className={shareStyles.thumbSheet}
                    key={`light-${sheet}`}
                    src={`/api/liqvid/static${encodeURIComponent(`${projectPath}/.liqvid/thumbs/light/${sheet}`)}`}
                  />
                ))}
              </div>
            </div>
          )}
          {thumbSheets.dark.length > 0 && (
            <div className={shareStyles.thumbsScheme}>
              <span className={shareStyles.thumbsSchemeLabel}>Dark</span>
              <div className={shareStyles.thumbsGrid}>
                {thumbSheets.dark.map((sheet) => (
                  <img
                    alt={`Dark thumbnail sheet ${sheet}`}
                    className={shareStyles.thumbSheet}
                    key={`dark-${sheet}`}
                    src={`/api/liqvid/static${encodeURIComponent(`${projectPath}/.liqvid/thumbs/dark/${sheet}`)}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
