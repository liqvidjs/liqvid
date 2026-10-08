"use client";

import type { ParameterValues } from "@liqvid/schemas";
import { useProjectPath } from "@liqvid/studio-plugin-api";
import { WaveformIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { Effect, Exit } from "effect";
import { useCallback, useEffect, useState } from "react";

import type { AudioEntry } from "#_/api/schemas";
import { clientRuntime, LiqvidStudioApiClient } from "#_/client";
import { colors, dims, rounded, spacing, text } from "#_/design/tokens.stylex";
import type { Localized } from "#_/i18n/shared";
import { Button } from "#_/ui/Button";
import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from "#_/ui/Dialog";
import { useDialogApi } from "#_/ui/dialogs-shared";
import { Spinner } from "#_/ui/Spinner";
import { TextField } from "#_/ui/TextField";
import { useTranslations } from "#_/utils/react";

import { CaptionRow } from "./CaptionsRow.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

export type { T as TranslationsCaptionsSection };

interface CaptionsSectionProps {
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
  emptyMessage: {
    color: colors.grayDim,
    fontSize: text.md,
    padding: spacing.xl,
  },
  formField: {
    columnGap: spacing.lg,
    display: "flex",
    flexDirection: "column",
    rowGap: spacing.lg,
  },
  loading: {
    alignItems: "center",
    display: "flex",
    justifyContent: "center",
    padding: spacing.xl,
  },
  renderList: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.md,
    listStyle: "none",
    margin: spacing.zero,
    maxHeight: "300px",
    overflowY: "auto",
    padding: spacing.zero,
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
  textInput: {
    backgroundColor: colors.grayApp,
    borderColor: {
      ":focus": colors.accentSolid,
      default: colors.graySep,
    },
    borderRadius: rounded.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.grayNormal,
    fontSize: text.md,
    outlineStyle: "none",
    paddingBlock: spacing.md,
    paddingInline: spacing.md,
    width: "100%",
  },
});

export function CaptionsSection({ selectedParams }: CaptionsSectionProps) {
  // const { hasCaptioningConfigured } = useDerivedConfig();
  const { captions: t } = useTranslations<{ captions: T }>();

  const projectPath = useProjectPath();

  // Serialize params for use in API calls
  const paramsJson = JSON.stringify(selectedParams ?? {});

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
      <div sx={styles.section}>
        <div sx={styles.sectionActions}>
          <Button disabled={isGeneratingAudio} onClick={handleGenerateAudio}>
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
          <div sx={styles.loading}>
            <Spinner size={24} />
          </div>
        ) : audio.length === 0 ? (
          <p sx={styles.emptyMessage}>{t.empty({ label: t.generate })}</p>
        ) : (
          <ul sx={styles.renderList}>
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
          <DialogBackdrop forceRender />
          <DialogPopup>
            <DialogTitle>{t.rename.title}</DialogTitle>
            <div sx={styles.formField}>
              <TextField
                label={t.rename.name}
                onChange={(value) => setRenameValue(value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isRenaming) {
                    handleRename();
                  }
                }}
                sx={styles.textInput}
                value={renameValue}
              />
            </div>
            <div sx={styles.dialogActions}>
              <DialogClose />
              <Button
                disabled={isRenaming || !renameValue.trim()}
                onClick={handleRename}
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
