"use client";

import { useProjectPath } from "@liqvid/studio-plugin-api";
import { WaveformIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { Effect, Exit } from "effect";
import { useCallback, useEffect, useState } from "react";

import type { AudioEntry } from "#_/api/schemas.mjs";
import { clientRuntime, LiqvidStudioApiClient } from "#_/client.mjs";
import { Spinner } from "#_/components/Spinner.js";
import type { Localized } from "#_/i18n/shared.mjs";
import { Button } from "#_/ui/Button.js";
import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  useDialogApi,
} from "#_/ui/Dialog.js";
import { useCommonTranslations, useTranslations } from "#_/utils/react.js";

import { form } from "../../root.sx.ts";
import { shareStyles } from "../share.sx.ts";

import { CaptionRow } from "./CaptionsRow.tsx";

import type TranslationsJson from "../.translations/en.json";

type T = Localized<typeof TranslationsJson>;

interface CaptionsSectionProps {
  /** Selected parameter values for parameterized projects */
  selectedParams?: Readonly<Record<string, string>>;
}

export function CaptionsSection({ selectedParams }: CaptionsSectionProps) {
  // const { hasCaptioningConfigured } = useDerivedConfig();
  const t = useTranslations<T>().captions;
  const c = useCommonTranslations();

  const projectPath = useProjectPath();

  // Serialize params for use in API calls
  const paramsJson = selectedParams
    ? JSON.stringify(selectedParams)
    : undefined;

  const { isOpen } = useDialogApi();

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
        return yield* client.audio.list({
          query: { params: paramsJson, projectPath },
        });
      }),
    );

    if (Exit.isSuccess(result)) {
      setAudio(result.value.items);
      setMultiple(result.value.multiple);
    } else {
      console.error("Failed to load audio:", result.cause);
    }

    setIsLoading(false);
  }, [paramsJson, projectPath]);

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
          query: { params: paramsJson, projectPath },
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
          query: { params: paramsJson, projectPath },
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
      <div sx={shareStyles.section}>
        <div sx={shareStyles.sectionActions}>
          <Button
            {...stylex.props(shareStyles.addButton)}
            disabled={isGeneratingAudio}
            onClick={handleGenerateAudio}
            type="button"
          >
            {isGeneratingAudio ? (
              <>
                <Spinner size={16} /> {t.inProgress}
              </>
            ) : (
              <>
                <WaveformIcon size={16} /> {t.generate}
              </>
            )}
          </Button>
        </div>

        {isLoading && audio.length === 0 ? (
          <div sx={shareStyles.loading}>
            <Spinner size={24} />
          </div>
        ) : audio.length === 0 ? (
          <p sx={shareStyles.emptyMessage}>{t.empty}</p>
        ) : (
          <ul sx={shareStyles.renderList}>
            {audio.map((entry) => (
              <CaptionRow
                entry={entry}
                key={entry.id}
                multiple={multiple}
                onReload={loadAudio}
                onStartRename={handleStartRename}
                selectedParams={selectedParams}
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
          <DialogBackdrop />
          <DialogPopup>
            <DialogTitle>{t.rename.title}</DialogTitle>
            <div sx={form.formField}>
              <label htmlFor="audio-name">{t.rename.name}</label>
              <input
                id="audio-name"
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isRenaming) {
                    handleRename();
                  }
                }}
                sx={shareStyles.textInput}
                type="text"
                value={renameValue}
              />
            </div>
            <div sx={form.dialogActions}>
              <DialogClose>{c.cancel}</DialogClose>
              <Button
                className={stylex.props(form.submitButton).className}
                disabled={isRenaming || !renameValue.trim()}
                onClick={handleRename}
                type="button"
              >
                {isRenaming ? (
                  <>
                    <Spinner size={16} /> {t.rename.inProgress}
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
