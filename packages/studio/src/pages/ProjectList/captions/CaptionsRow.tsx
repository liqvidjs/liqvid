import { useProjectPath } from "@liqvid/studio-plugin-api";
import {
  CheckCircleIcon,
  ClosedCaptioningIcon,
  PencilSimpleIcon,
  TrashIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { Effect, Exit } from "effect";
import { useState } from "react";

import type { AudioEntry } from "#_/api/schemas.mjs";
import { clientRuntime, LiqvidStudioApiClient } from "#_/client.mjs";
import { useDerivedConfig } from "#_/components/DerivedConfig.js";
import { Spinner } from "#_/components/Spinner.js";
import { AUDIO_WAV } from "#_/conventions.mjs";
import { colors, dims, radii, spacing, text } from "#_/design/tokens.stylex.js";
import { Button } from "#_/ui/Button.js";
import { Time, TimeDuration } from "#_/ui/Time.js";

type CaptionsStatus = NonNullable<AudioEntry["captions"]>["status"];

const styles = stylex.create({
  deleteButton: {
    alignItems: "center",
    backgroundColor: {
      ":hover": colors.deleteBtnBgHover,
      default: colors.errorSubtle,
    },
    borderColor: colors.deleteBtnBorder,
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.errorText,
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    padding: spacing.sm,
    transition: "background-color 0.15s",
  },
  renderActionButton: {
    alignItems: "center",
    backgroundColor: {
      ":hover": colors.grayHover,
      default: colors.graySubtle,
    },
    borderColor: colors.graySep,
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.grayNormal,
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    padding: spacing.sm,
    transition: "background-color 0.15s",
  },
  renderActions: {
    display: "flex",
    flexShrink: 0,
    gap: spacing.sm,
  },
  renderDetails: {
    color: colors.grayDim,
    display: "flex",
    fontSize: text.md,
    gap: spacing.lg,
  },
  renderHeader: {
    alignItems: "center",
    display: "flex",
    gap: spacing.lg,
  },
  renderInfo: {
    display: "flex",
    flex: "1",
    flexDirection: "column",
    gap: spacing.xs,
    minWidth: 0,
  },
  renderItem: {
    alignItems: "center",
    backgroundColor: colors.grayApp,
    borderColor: colors.graySep,
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: dims.sep,
    display: "flex",
    gap: spacing.lg,
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  renderName: {
    color: colors.grayNormal,
    fontSize: text.md,
    fontWeight: 500,
  },
  renderStatus: {
    alignItems: "center",
    color: colors.grayDim,
    display: "flex",
    fontSize: text.md,
    gap: spacing.xs,
  },
  statusCompleted: {
    color: colors.successSolid,
  },
  statusFailed: {
    color: colors.errorSolid,
  },
});

function getCaptionsStatusIcon(status: CaptionsStatus) {
  switch (status) {
    case "pending":
    case "generating":
      return <Spinner size={16} />;
    case "completed":
      return (
        <CheckCircleIcon
          {...stylex.props(styles.statusCompleted)}
          size={16}
          weight="fill"
        />
      );
    case "failed":
      return (
        <WarningCircleIcon
          {...stylex.props(styles.statusFailed)}
          size={16}
          weight="fill"
        />
      );
  }
}

function getCaptionsStatusLabel(status: CaptionsStatus) {
  switch (status) {
    case "pending":
      return "Captions pending";
    case "generating":
      return "Captioning...";
    case "completed":
      return "Captioned";
    case "failed":
      return "Captioning failed";
  }
}

export function CaptionRow({
  entry,
  multiple,
  onReload,
  onStartRename,
  selectedParams,
}: {
  entry: AudioEntry;
  multiple: boolean;
  onReload: () => Promise<void>;
  onStartRename: (entry: AudioEntry) => void;
  /** Selected parameter values for parameterized projects */
  selectedParams?: Record<string, string>;
}) {
  const projectPath = useProjectPath();
  const { hasCaptioningConfigured } = useDerivedConfig();

  // Serialize params for use in API calls
  const paramsJson = selectedParams
    ? JSON.stringify(selectedParams)
    : undefined;

  /** Whether captions are currently being (re)generated for this entry */
  const [captioning, setCaptioning] = useState(false);

  const isGenerating =
    entry.captions?.status === "pending" ||
    entry.captions?.status === "generating" ||
    captioning;

  const handleGenerateCaptions = async () => {
    setCaptioning(true);

    const result = await clientRuntime.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;
        return yield* client.captions.generate({
          payload: { audioId: entry.id },
          query: { params: paramsJson, projectPath },
        });
      }),
    );

    if (Exit.isFailure(result)) {
      // TODO: display error to user
    }

    setCaptioning(false);
    await onReload();
  };

  const handleDeleteCaptions = async () => {
    const result = await clientRuntime.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;
        return yield* client.captions.delete({
          payload: { audioId: entry.id },
          query: { params: paramsJson, projectPath },
        });
      }),
    );

    if (Exit.isFailure(result)) {
      console.error("Failed to delete captions:", result.cause);
    }
    await onReload();
  };

  const handleDeleteAudio = async () => {
    const result = await clientRuntime.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;
        return yield* client.audio.delete({
          payload: { id: entry.id },
          query: { params: paramsJson, projectPath },
        });
      }),
    );

    if (Exit.isFailure(result)) {
      console.error("Failed to delete audio:", result.cause);
    }
    await onReload();
  };

  return (
    <li sx={styles.renderItem}>
      <div sx={styles.renderInfo}>
        <div sx={styles.renderHeader}>
          <span sx={styles.renderName}>{multiple ? entry.id : AUDIO_WAV}</span>
          {entry.captions && (
            <span sx={styles.renderStatus}>
              {getCaptionsStatusIcon(entry.captions.status)}
              {getCaptionsStatusLabel(entry.captions.status)}
            </span>
          )}
        </div>
        <div sx={styles.renderDetails}>
          <Time format="date-and-time" value={entry.meta.createdAt} />
          {entry.meta.state === "completed" && (
            <TimeDuration value={{ seconds: entry.meta.duration }} />
          )}
        </div>
      </div>
      <div sx={styles.renderActions}>
        <Button
          disabled={!hasCaptioningConfigured || isGenerating}
          onClick={handleGenerateCaptions}
          title={
            hasCaptioningConfigured
              ? entry.captions
                ? "Regenerate captions"
                : "Generate captions"
              : "Captioning is not configured"
          }
          type="button"
        >
          {isGenerating ? (
            <Spinner size={16} />
          ) : (
            <ClosedCaptioningIcon size={16} />
          )}
        </Button>
        {entry.captions && (
          <Button
            {...stylex.props(styles.deleteButton)}
            onClick={handleDeleteCaptions}
            title="Delete captions"
          >
            <ClosedCaptioningIcon size={16} weight="fill" />
          </Button>
        )}
        {multiple && (
          <Button
            {...stylex.props(styles.renderActionButton)}
            onClick={() => onStartRename(entry)}
            title="Rename audio"
          >
            <PencilSimpleIcon size={16} />
          </Button>
        )}
        <Button
          {...stylex.props(styles.deleteButton)}
          onClick={handleDeleteAudio}
          title="Delete audio (and captions)"
        >
          <TrashIcon size={16} />
        </Button>
      </div>
    </li>
  );
}
