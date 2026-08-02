"use client";

import { useProjectPath } from "@liqvid/studio-plugin-api";
import { SpinnerIcon, WaveformIcon } from "@phosphor-icons/react";
import { Effect, Exit } from "effect";
import { useCallback, useEffect, useState } from "react";

import type { AudioEntry } from "../../../api/schemas.mts";
import { clientRuntime, LiqvidStudioApiClient } from "../../../client.mts";
import { useDerivedConfig } from "../../../components/DerivedConfig.tsx";
import { Button } from "../../../ui/Button.tsx";
import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from "../../../ui/Dialog.tsx";
import {
  useCommonTranslations,
  useTranslations,
} from "../../../utils/react.tsx";

import { CaptionRow } from "./CaptionsRow.tsx";

import styles from "../../root.module.css";
import shareStyles from "../share.module.css";

import type TranslationsJson from "../.translations/en.json";

type T = typeof TranslationsJson;

interface CaptionsSectionProps {
  /** Whether the parent dialog is open */
  isOpen: boolean;
}

export function CaptionsSection({ isOpen }: CaptionsSectionProps) {
  const { hasCaptioningConfigured } = useDerivedConfig();
  const t = useTranslations<T>().captions;
  const c = useCommonTranslations();
  const projectPath = useProjectPath();
  const [audio, setAudio] = useState<readonly AudioEntry[]>([]);
  const [multiple, setMultiple] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [renaming, setRenaming] = useState<AudioEntry | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  const loadAudio = useCallback(async () => {
    setIsLoading(true);

    const result = await clientRuntime.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;
        return yield* client.audio.list({ query: { projectPath } });
      }),
    );

    if (Exit.isSuccess(result)) {
      setAudio(result.value.items);
      setMultiple(result.value.multiple);
    } else {
      console.error("Failed to load audio:", result.cause);
    }

    setIsLoading(false);
  }, [projectPath]);

  useEffect(() => {
    if (isOpen) {
      loadAudio();
    }
  }, [isOpen, loadAudio]);

  // Poll for updates while any captions are generating
  useEffect(() => {
    if (!isOpen) return;

    const isActive = audio.some(
      (a) =>
        a.captions?.status === "pending" || a.captions?.status === "generating",
    );

    if (!isActive) return;

    const interval = setInterval(loadAudio, 3000);
    return () => clearInterval(interval);
  }, [isOpen, audio, loadAudio]);

  const handleGenerateAudio = async () => {
    setIsGeneratingAudio(true);

    const result = await clientRuntime.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;
        return yield* client.audio.generate({
          payload: null,
          query: { projectPath },
        });
      }),
    );

    if (Exit.isSuccess(result)) {
      await loadAudio();
    } else {
      console.error("Failed to generate audio:", result.cause);
    }

    setIsGeneratingAudio(false);
  };

  const handleStartRename = (entry: AudioEntry) => {
    setRenaming(entry);
    setRenameValue(entry.id);
  };

  const handleRename = async () => {
    if (!renaming || !renameValue.trim()) return;

    setIsRenaming(true);

    const result = await clientRuntime.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;
        return yield* client.audio.rename({
          payload: { id: renaming.id, newName: renameValue.trim() },
          query: { projectPath },
        });
      }),
    );

    if (Exit.isSuccess(result)) {
      setRenaming(null);
      await loadAudio();
    } else {
      console.error("Failed to rename audio:", result.cause);
    }

    setIsRenaming(false);
  };

  return (
    <>
      <div className={shareStyles.section}>
        <div className={shareStyles.sectionActions}>
          <Button
            className={shareStyles.addButton}
            disabled={isGeneratingAudio}
            onClick={handleGenerateAudio}
            type="button"
          >
            {isGeneratingAudio ? (
              <>
                <SpinnerIcon className={shareStyles.spinner} size={16} />{" "}
                {t.inProgress}
              </>
            ) : (
              <>
                <WaveformIcon size={16} /> {t.generate}
              </>
            )}
          </Button>
        </div>

        {isLoading && audio.length === 0 ? (
          <div className={shareStyles.loading}>
            <SpinnerIcon className={shareStyles.spinner} size={24} />
          </div>
        ) : audio.length === 0 ? (
          <p className={shareStyles.emptyMessage}>{t.empty}</p>
        ) : (
          <ul className={shareStyles.renderList}>
            {audio.map((entry) => (
              <CaptionRow
                entry={entry}
                key={entry.id}
                multiple={multiple}
                onReload={loadAudio}
                onStartRename={handleStartRename}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Rename Dialog */}
      <DialogRoot
        onOpenChange={(open) => !open && setRenaming(null)}
        open={!!renaming}
      >
        <DialogPortal>
          <DialogBackdrop className={styles.dialogOverlay} />
          <DialogPopup className={styles.dialog}>
            <DialogTitle className={styles.dialogTitle}>
              {t.rename.title}
            </DialogTitle>
            <div className={styles.formField}>
              <label htmlFor="audio-name">{t.rename.name}</label>
              <input
                className={shareStyles.textInput}
                id="audio-name"
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isRenaming) {
                    handleRename();
                  }
                }}
                type="text"
                value={renameValue}
              />
            </div>
            <div className={styles.dialogActions}>
              <DialogClose>{c.cancel}</DialogClose>
              <Button
                className={styles.submitButton}
                disabled={isRenaming || !renameValue.trim()}
                onClick={handleRename}
                type="button"
              >
                {isRenaming ? (
                  <>
                    <SpinnerIcon className={shareStyles.spinner} size={16} />{" "}
                    {t.rename.inProgress}
                  </>
                ) : (
                  t.rename.action
                )}
              </Button>
            </div>
          </DialogPopup>
        </DialogPortal>
      </DialogRoot>
    </>
  );
}
