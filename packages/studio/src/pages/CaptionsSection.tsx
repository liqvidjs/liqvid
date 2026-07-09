"use client";

import {
  CheckCircleIcon,
  ClosedCaptioningIcon,
  FolderOpenIcon,
  SpinnerIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Effect, Exit } from "effect";
import { useCallback, useEffect, useState } from "react";

import { clientRuntime, LiqvidStudioApiClient } from "../client.mts";
import type { CaptionsMeta } from "../types/schemas.mts";

import { openCaptionsInFinderAction } from "./root-actions.ts";

import shareStyles from "./share.module.css";

interface CaptionsSectionProps {
  projectPath: string;
  /** Whether the parent dialog is open */
  isOpen: boolean;
}

export function CaptionsSection({ isOpen, projectPath }: CaptionsSectionProps) {
  const [captionsMeta, setCaptionsMeta] = useState<CaptionsMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadCaptions = useCallback(async () => {
    setIsLoading(true);

    const result = await clientRuntime.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;
        return yield* client.captions.list({ query: { projectPath } });
      }),
    );

    if (Exit.isSuccess(result)) {
      setCaptionsMeta(result.value);
    } else {
      for (const reason of result.cause.reasons) {
        if (reason._tag === "Fail" && reason.error._tag === "NotFound") {
        } else {
          console.error("Failed to load captions:", result.cause);
        }
      }
    }

    setIsLoading(false);
  }, [projectPath]);

  useEffect(() => {
    if (isOpen) {
      loadCaptions();
    }
  }, [isOpen, loadCaptions]);

  // Poll for updates when generating
  useEffect(() => {
    if (!isOpen) return;

    const isActive =
      captionsMeta?.status === "pending" ||
      captionsMeta?.status === "generating";

    if (!isActive) return;

    const interval = setInterval(loadCaptions, 3000);
    return () => clearInterval(interval);
  }, [isOpen, captionsMeta?.status, loadCaptions]);

  const handleGenerate = async () => {
    setIsGenerating(true);

    const result = await clientRuntime.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;
        return yield* client.captions.generate({
          payload: undefined,
          query: { projectPath },
        });
      }),
    );

    if (Exit.isSuccess(result)) {
      await loadCaptions();
    } else {
      console.error("Failed to generate captions:", result.cause);
    }

    setIsGenerating(false);
  };

  const handleOpenInFinder = async () => {
    await openCaptionsInFinderAction(projectPath);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getStatusIcon = (status: CaptionsMeta["status"]) => {
    switch (status) {
      case "pending":
      case "generating":
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

  const getStatusLabel = (status: CaptionsMeta["status"]) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "generating":
        return "Generating...";
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
    }
  };

  const isActiveGeneration =
    captionsMeta?.status === "pending" || captionsMeta?.status === "generating";

  return (
    <div className={shareStyles.section}>
      <div className={shareStyles.sectionActions}>
        <button
          className={shareStyles.addButton}
          disabled={isGenerating || isActiveGeneration}
          onClick={handleGenerate}
          type="button"
        >
          {isGenerating || isActiveGeneration ? (
            <>
              <SpinnerIcon className={shareStyles.spinner} size={16} />{" "}
              Generating...
            </>
          ) : (
            <>
              <ClosedCaptioningIcon size={16} /> Generate
            </>
          )}
        </button>
      </div>

      {isLoading && !captionsMeta ? (
        <div className={shareStyles.loading}>
          <SpinnerIcon className={shareStyles.spinner} size={24} />
        </div>
      ) : !captionsMeta ? (
        <p className={shareStyles.emptyMessage}>
          No captions yet. Click "Generate" to transcribe audio using Whisper.
        </p>
      ) : (
        <ul className={shareStyles.renderList}>
          <li className={shareStyles.renderItem}>
            <div className={shareStyles.renderInfo}>
              <div className={shareStyles.renderHeader}>
                <span className={shareStyles.renderName}>captions.vtt</span>
                <span className={shareStyles.renderStatus}>
                  {getStatusIcon(captionsMeta.status)}
                  {getStatusLabel(captionsMeta.status)}
                </span>
              </div>
              <div className={shareStyles.renderDetails}>
                <span>{formatDate(captionsMeta.createdAt)}</span>
              </div>
            </div>
            <div className={shareStyles.renderActions}>
              {captionsMeta.status === "completed" && (
                <button
                  className={shareStyles.renderActionButton}
                  onClick={handleOpenInFinder}
                  title="Open in Finder"
                  type="button"
                >
                  <FolderOpenIcon size={16} />
                </button>
              )}
            </div>
          </li>
        </ul>
      )}
    </div>
  );
}
