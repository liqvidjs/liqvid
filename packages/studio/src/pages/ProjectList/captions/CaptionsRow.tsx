import { useProjectPath } from "@liqvid/studio-plugin-api";
import {
  CheckCircleIcon,
  ClosedCaptioningIcon,
  PencilSimpleIcon,
  SpinnerIcon,
  TrashIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { Effect, Exit } from "effect";
import { useState } from "react";

import type { AudioEntry } from "#_/api/schemas.mjs";
import { clientRuntime, LiqvidStudioApiClient } from "#_/client.mjs";
import { useDerivedConfig } from "#_/components/DerivedConfig.js";
import { AUDIO_WAV } from "#_/conventions.mjs";
import { Button } from "#_/ui/Button.js";
import { Time, TimeDuration } from "#_/ui/Time.js";

import { shareStyles } from "../share.sx.ts";

type CaptionsStatus = NonNullable<AudioEntry["captions"]>["status"];

function getCaptionsStatusIcon(status: CaptionsStatus) {
  switch (status) {
    case "pending":
    case "generating":
      return <SpinnerIcon {...stylex.props(shareStyles.spinner)} size={16} />;
    case "completed":
      return (
        <CheckCircleIcon
          {...stylex.props(shareStyles.statusCompleted)}
          size={16}
          weight="fill"
        />
      );
    case "failed":
      return (
        <WarningCircleIcon
          {...stylex.props(shareStyles.statusFailed)}
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
    <li {...stylex.props(shareStyles.renderItem)}>
      <div {...stylex.props(shareStyles.renderInfo)}>
        <div {...stylex.props(shareStyles.renderHeader)}>
          <span {...stylex.props(shareStyles.renderName)}>
            {multiple ? entry.id : AUDIO_WAV}
          </span>
          {entry.captions && (
            <span {...stylex.props(shareStyles.renderStatus)}>
              {getCaptionsStatusIcon(entry.captions.status)}
              {getCaptionsStatusLabel(entry.captions.status)}
            </span>
          )}
        </div>
        <div {...stylex.props(shareStyles.renderDetails)}>
          <Time format="date-and-time" value={entry.meta.createdAt} />
          {entry.meta.state === "completed" && (
            <TimeDuration value={{ seconds: entry.meta.duration }} />
          )}
        </div>
      </div>
      <div {...stylex.props(shareStyles.renderActions)}>
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
            <SpinnerIcon {...stylex.props(shareStyles.spinner)} size={16} />
          ) : (
            <ClosedCaptioningIcon size={16} />
          )}
        </Button>
        {entry.captions && (
          <Button
            {...stylex.props(shareStyles.deleteButton)}
            onClick={handleDeleteCaptions}
            title="Delete captions"
            type="button"
          >
            <ClosedCaptioningIcon size={16} weight="fill" />
          </Button>
        )}
        {multiple && (
          <Button
            {...stylex.props(shareStyles.renderActionButton)}
            onClick={() => onStartRename(entry)}
            title="Rename audio"
            type="button"
          >
            <PencilSimpleIcon size={16} />
          </Button>
        )}
        <Button
          {...stylex.props(shareStyles.deleteButton)}
          onClick={handleDeleteAudio}
          title="Delete audio (and captions)"
          type="button"
        >
          <TrashIcon size={16} />
        </Button>
      </div>
    </li>
  );
}
