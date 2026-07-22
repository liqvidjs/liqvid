import { useProjectPath } from "@liqvid/studio-plugin-api";
import {
  CheckCircleIcon,
  ClosedCaptioningIcon,
  PencilSimpleIcon,
  SpinnerIcon,
  TrashIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Effect, Exit } from "effect";
import type { RelativeDir } from "effect-paths";
import { useState } from "react";

import type { AudioEntry } from "../../../api/schemas.mts";
import { clientRuntime, LiqvidStudioApiClient } from "../../../client.mts";
import { AUDIO_WAV } from "../../../conventions.mts";
import { Time, TimeDuration } from "../../../ui/Time.tsx";

import shareStyles from "../share.module.css";

type CaptionsStatus = NonNullable<AudioEntry["captions"]>["status"];

function getCaptionsStatusIcon(status: CaptionsStatus) {
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
}: {
  entry: AudioEntry;
  multiple: boolean;
  onReload: () => Promise<void>;
  onStartRename: (entry: AudioEntry) => void;
}) {
  const projectPath = useProjectPath();

  /** Whether captions are currently being (re)generated for this entry */
  const [captioning, setCaptioning] = useState(false);

  const isActive =
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
          query: { projectPath },
        });
      }),
    );

    if (Exit.isFailure(result)) {
      console.dir(
        result.cause.reasons.map((r) => {
          switch (r._tag) {
            case "Fail":
              return { Fail: r.error };
            case "Die":
              return { Die: r.defect };
            case "Interrupt":
              return { Interrupt: r.fiberId };
            default:
              return { Unknown: r };
          }
        }),
        { depth: null },
      );
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
          query: { projectPath },
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
          query: { projectPath },
        });
      }),
    );

    if (Exit.isFailure(result)) {
      console.error("Failed to delete audio:", result.cause);
    }
    await onReload();
  };

  return (
    <li className={shareStyles.renderItem}>
      <div className={shareStyles.renderInfo}>
        <div className={shareStyles.renderHeader}>
          <span className={shareStyles.renderName}>
            {multiple ? entry.meta.name : AUDIO_WAV}
          </span>
          {entry.captions && (
            <span className={shareStyles.renderStatus}>
              {getCaptionsStatusIcon(entry.captions.status)}
              {getCaptionsStatusLabel(entry.captions.status)}
            </span>
          )}
        </div>
        <div className={shareStyles.renderDetails}>
          <Time format="date-and-time" value={entry.meta.createdAt} />
          <TimeDuration value={{ seconds: entry.meta.duration }} />
        </div>
      </div>
      <div className={shareStyles.renderActions}>
        <button
          className={shareStyles.renderActionButton}
          disabled={isActive}
          onClick={handleGenerateCaptions}
          title={entry.captions ? "Regenerate captions" : "Generate captions"}
          type="button"
        >
          {isActive ? (
            <SpinnerIcon className={shareStyles.spinner} size={16} />
          ) : (
            <ClosedCaptioningIcon size={16} />
          )}
        </button>
        {entry.captions && (
          <button
            className={shareStyles.deleteButton}
            onClick={handleDeleteCaptions}
            title="Delete captions"
            type="button"
          >
            <ClosedCaptioningIcon size={16} weight="fill" />
          </button>
        )}
        {multiple && (
          <button
            className={shareStyles.renderActionButton}
            onClick={() => onStartRename(entry)}
            title="Rename audio"
            type="button"
          >
            <PencilSimpleIcon size={16} />
          </button>
        )}
        <button
          className={shareStyles.deleteButton}
          onClick={handleDeleteAudio}
          title="Delete audio (and captions)"
          type="button"
        >
          <TrashIcon size={16} />
        </button>
      </div>
    </li>
  );
}
