"use client";

import "./recording.css";

import { MediaRecording } from "@liqvid/media/recording";
import { PromptsProvider } from "@liqvid/prompts";
import type { RichTranscript } from "@liqvid/schemas";
import { MarkerRecording } from "@liqvid/script/recording";
import {
  LiqvidDevToolsProvider,
  type LiqvidStudioPlugin,
  RecordingControl,
} from "@liqvid/studio";
import type { Awaitable } from "@liqvid/utils";
import clsx from "clsx";
import {
  ColorSchemeProvider,
  Controls,
  type DurationLike,
  type HidingStrategy,
  Playback,
  PlaybackProvider,
  Player,
  type Script,
  ScriptProvider,
  SegmentProvider,
} from "liqvid";
import { lazy, useState } from "react";

import { SuspenseHook } from "@/components/SuspenseHook";
import {
  persistColorScheme,
  persistMute,
  persistVolume,
} from "@/lib/persistence";
import { useSeekFromSearch } from "@/lib/seek-from-search";

import { ShowRecordingTime } from "../dev/ShowRecordingTime.tsx";

import { KeyboardShortcuts } from "./controls/KeyboardShortcuts.tsx";
import {
  AdditionalSettings,
  captionsClassName,
  FullScreen,
  MuteButton,
  PlayPause,
  VolumeSlider,
} from "./controls.tsx";
import { LoadingScreen } from "./LoadingScreen.tsx";
import { shortcuts } from "./shortcuts.ts";

/* development-only controls */
const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";

const ShowMarkerName = isDevelopment
  ? lazy(() =>
      import("@/components/dev/ShowMarkerName").then((imports) => ({
        default: imports.ShowMarkerName,
      })),
    )
  : () => null;

export function LiqvidPlayer<M extends string>({
  duration,
  hideWith,
  plugins,
  script,
  ...props
}: React.ComponentProps<typeof PlayerChrome> & {
  hideWith?: HidingStrategy;

  plugins?: LiqvidStudioPlugin[];
} & (
    | {
        duration?: DurationLike;
        script?: undefined;
      }
    | {
        duration?: undefined;
        script: Script<M>;
      }
  )) {
  // use playback from provided Script if any, otherwise create one from duration
  const [playback] = useState(() => {
    if (script) {
      return script.playback;
    }
    const playback = new Playback();
    playback.duration$ = duration ?? { minutes: 1 };
    return playback;
  });

  // providers
  return (
    <ColorSchemeProvider persistence={persistColorScheme}>
      <ScriptProvider script={script} shortcuts={shortcuts.script}>
        <PlaybackProvider
          restore={{ muted: persistMute, volume: persistVolume }}
          value={playback}
        >
          <LiqvidDevToolsProvider
            plugins={
              isDevelopment
                ? [
                    MediaRecording,
                    ...(script ? [MarkerRecording] : []),
                    ...(plugins ?? []),
                  ]
                : []
            }
            projectPath={props.projectPath}
          >
            <SegmentProvider hideWith={hideWith}>
              <PlayerChrome {...props} />
            </SegmentProvider>
          </LiqvidDevToolsProvider>
        </PlaybackProvider>
      </ScriptProvider>
    </ColorSchemeProvider>
  );
}

function PlayerChrome({
  children,
  classNames: propClassNames,
  loadingScreen,
  projectPath,
  thumbs,
  transcript,
  ...props
}: React.ComponentProps<typeof Player.Root> & {
  classNames?: {
    canvas?: string;
    controls?: string;
  };

  /** Whether this project needs a loading screen. */
  loadingScreen?: boolean;

  /**
   * Path to the project on disk, to be passed to the Dev Tools provider.
   * Only used in development, value is ignored in production.
   */
  projectPath: string;

  thumbs?: React.ComponentProps<typeof Controls.ScrubberBar>["thumbs"];

  transcript?: Awaitable<RichTranscript>;
}) {
  return (
    <Player.Root {...props}>
      {/* support automatic seeking from the URL */}
      <SuspenseHook hook={useSeekFromSearch} />

      {/* loading screen for projects that need it */}
      {loadingScreen && <LoadingScreen />}

      <PromptsProvider
        persistence={{ prefix: `liqvid.prompts[${projectPath}].` }}
        shortcut={shortcuts.togglePrompts}
      >
        <Player.Controls
          className={propClassNames?.controls}
          hideAfter={{ seconds: 3 }}
        >
          <Controls.ScrubberBar shortcuts={shortcuts.seeking} thumbs={thumbs} />
          <KeyboardShortcuts />
          <div className="lv-controls-buttons h-(--lv-controls-height)">
            <PlayPause />

            {/* left controls */}
            <MuteButton />
            <VolumeSlider />
            <Controls.TimeDisplay />
            <ShowMarkerName />
            <ShowRecordingTime max={{ minutes: 5 }} />

            {/* right controls */}
            <div className="lv-controls-right h-full">
              <RecordingControl shortcuts={shortcuts.recording} />
              <AdditionalSettings transcript={transcript} />
              <FullScreen />
            </div>
          </div>
        </Player.Controls>
        <Player.Canvas
          className={clsx(
            "bg-[#eee] text-black",
            "dark:bg-[#202020] dark:text-white",
            "transition-colors duration-150",
            propClassNames?.canvas,
          )}
          pauseOnClick={isProduction}
        >
          {children}

          <Controls.Captions.Display className={captionsClassName} />
        </Player.Canvas>
      </PromptsProvider>
    </Player.Root>
  );
}
