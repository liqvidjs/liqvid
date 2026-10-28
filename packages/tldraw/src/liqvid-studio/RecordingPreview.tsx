"use client";

import "./stylex.css";

import type { RecordingData } from "@liqvid/recording";
import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  PlainString,
  TimeDuration,
} from "@liqvid/studio/ui";
import {
  colors,
  rounded,
  spacing,
  text,
  typeface,
} from "@liqvid/studio/ui/design-tokens.stylex.ts";
import type { RecordingComponentProps } from "@liqvid/studio-plugin-api";
import type { ReplayData } from "@liqvid/utils";
import type { Seekable } from "@lqv/playback";
import { SeekableContext } from "@lqv/playback/react";
import * as stylex from "@stylexjs/stylex";
import { RelativeFile } from "effect-paths";
import { useEffect, useReducer, useState } from "react";
import { TldrawUiContextProvider } from "tldraw";

import { TldrawReplay } from "../react/index.tsx";
import type { ReplayState, TldrawData, TldrawEvent } from "../types.ts";

const RECORDING_JSON = RelativeFile("recording.json");

type PreviewRecording = TldrawData & { initial: ReplayState };

const styles = stylex.create({
  dialogHeader: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
  },
  preview: {
    aspectRatio: "16 / 9",
    backgroundColor: colors.graySubtle,
    borderColor: colors.graySep,
    borderRadius: rounded.md,
    borderStyle: "solid",
    borderWidth: 1,
    maxHeight: "60vh",
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  previewControls: {
    alignItems: "center",
    display: "flex",
    gap: spacing.lg,
    marginTop: spacing.xl,
    paddingInline: spacing.md,
  },
  replay: {
    height: "100%",
    inset: 0,
    position: "absolute",
    width: "100%",
  },
  seekSlider: {
    appearance: "none",
    backgroundColor: colors.graySep,
    borderRadius: rounded.md,
    flex: "1",
    height: 6,
  },
  timeDisplay: {
    color: colors.grayDim,
    fontFamily: typeface.mono,
    fontSize: text.md,
    minWidth: "3rem",
    textAlign: "center",
    userSelect: "none",
  },
});

type PreviewSeekable = Seekable & {
  setDuration: (duration: number) => void;
};

function createPreviewSeekable(): PreviewSeekable {
  const events = new EventTarget();
  let currentTime = 0;
  let duration = 0;
  let seeking = false;

  return {
    addEventListener(type, listener) {
      events.addEventListener(type, listener as EventListener);
    },
    get currentTime() {
      return currentTime;
    },
    set currentTime(next) {
      if (next === currentTime) {
        return;
      }
      seeking = true;
      events.dispatchEvent(new Event("seeking"));
      currentTime = next;
      seeking = false;
      events.dispatchEvent(new Event("timeupdate"));
      events.dispatchEvent(new Event("seeked"));
    },
    get duration() {
      return duration;
    },
    get muted() {
      return false;
    },
    pause() {},
    get paused() {
      return true;
    },
    play() {
      return Promise.resolve();
    },
    get playbackRate() {
      return 1;
    },
    removeEventListener(type, listener) {
      events.removeEventListener(type, listener as EventListener);
    },
    get seeking() {
      return seeking;
    },
    setDuration(next) {
      // biome-ignore lint/nursery/useReactCompiler: duration is owned by this seekable facade
      duration = next;
      events.dispatchEvent(new Event("durationchange"));
    },
    get volume() {
      return 1;
    },
  };
}

type PreviewState = {
  loadError: boolean;
  open: boolean;
  previewTime: number;
  recording: PreviewRecording | null;
};

type PreviewAction =
  | { kind: "loadError"; value: boolean }
  | { kind: "open"; value: boolean }
  | { kind: "previewTime"; value: number }
  | { kind: "recording"; value: PreviewRecording | null };

function previewReducer(
  state: PreviewState,
  action: PreviewAction,
): PreviewState {
  switch (action.kind) {
    case "loadError": {
      return { ...state, loadError: action.value };
    }
    case "open": {
      return { ...state, open: action.value };
    }
    case "previewTime": {
      return { ...state, previewTime: action.value };
    }
    case "recording": {
      return { ...state, recording: action.value };
    }
  }
}

export function RecordingPreview({ files, loadFile }: RecordingComponentProps) {
  const hasRecording = files.has(RECORDING_JSON);
  const [state, dispatch] = useReducer(previewReducer, {
    loadError: false,
    open: false,
    previewTime: 0,
    recording: null,
  });
  const { loadError, open, previewTime, recording } = state;
  const [playback] = useState(createPreviewSeekable);

  useEffect(() => {
    if (!open || !hasRecording || recording) {
      return;
    }

    let active = true;

    loadFile(RECORDING_JSON)
      .then((content) => {
        const parsed = JSON.parse(content) as RecordingData<
          ReplayData<TldrawEvent>,
          ReplayState
        >;

        if (active) {
          dispatch({
            kind: "recording",
            value: {
              ...parsed,
              initialState: parsed.initial,
            } as PreviewRecording,
          });
          dispatch({ kind: "loadError", value: false });
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load tldraw recording preview:", error);
        if (active) {
          dispatch({ kind: "loadError", value: true });
        }
      });

    return () => {
      active = false;
    };
  }, [hasRecording, loadFile, open, recording]);

  const durationSeconds =
    (recording?.data.reduce((duration, [delta]) => duration + delta, 0) ?? 0) /
    1000;

  useEffect(() => {
    // The seekable facade exposes duration as a read-only media property.
    playback.setDuration(durationSeconds);
    // The seekable facade is an imperative object consumed through context.
    // biome-ignore lint/nursery/useReactCompiler: Playback exposes mutable media-like properties
    playback.currentTime = 0;
  }, [durationSeconds, playback]);

  if (!hasRecording) {
    return null;
  }

  const seek = (time: number) => {
    dispatch({ kind: "previewTime", value: time });
    // biome-ignore lint/nursery/useReactCompiler: Playback exposes mutable media-like properties
    playback.currentTime = time;
  };

  const handleOpenChange = (nextOpen: boolean) => {
    dispatch({ kind: "open", value: nextOpen });
    if (nextOpen) {
      dispatch({ kind: "loadError", value: false });
    }
  };

  return (
    <DialogRoot onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger>Preview</DialogTrigger>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup aria-describedby={undefined} size="auto">
          <div {...stylex.props(styles.dialogHeader)}>
            <DialogTitle>{PlainString("Tldraw preview")}</DialogTitle>
            <DialogClose />
          </div>

          <div {...stylex.props(styles.preview)}>
            {recording && (
              <SeekableContext.Provider value={playback}>
                <TldrawUiContextProvider>
                  <div sx={styles.replay}>
                    <TldrawReplay
                      hideUi
                      onMount={(editor) => {
                        editor.updateInstanceState({ isReadonly: true });
                      }}
                      replay={recording}
                    />
                  </div>
                </TldrawUiContextProvider>
              </SeekableContext.Provider>
            )}
          </div>

          {loadError ? (
            <p>Unable to load this recording preview.</p>
          ) : !recording ? (
            <p>Loading preview…</p>
          ) : (
            <div {...stylex.props(styles.previewControls)}>
              <TimeDuration
                value={{ seconds: previewTime }}
                {...stylex.props(styles.timeDisplay)}
              />
              <input
                aria-label="Preview time"
                disabled={durationSeconds === 0}
                max={durationSeconds}
                min={0}
                onChange={(event) => seek(event.currentTarget.valueAsNumber)}
                step={0.1}
                sx={styles.seekSlider}
                type="range"
                value={previewTime}
              />
              <TimeDuration
                value={{ seconds: durationSeconds }}
                {...stylex.props(styles.timeDisplay)}
              />
            </div>
          )}
        </DialogPopup>
      </DialogPortal>
    </DialogRoot>
  );
}
