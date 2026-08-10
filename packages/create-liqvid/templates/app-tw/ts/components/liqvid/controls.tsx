"use client";

import { Dialog, Menu } from "@base-ui/react";
import type { RichTranscript } from "@liqvid/schemas";
import { type Awaitable, useToggle } from "@liqvid/utils";
import {
  ClosedCaptioningIcon,
  CornersInIcon,
  CornersOutIcon,
  GearIcon,
  MoonIcon,
  NotePencilIcon,
  PauseIcon,
  PlayIcon,
  SmileyIcon,
  SmileyXEyesIcon,
  SpeakerHighIcon,
  SpeakerLowIcon,
  SpeakerNoneIcon,
  SpeakerXIcon,
  SubtitlesIcon,
  SunIcon,
} from "@phosphor-icons/react";
import clsx from "clsx";
import {
  Controls,
  HydrateElement,
  HydrateVariants,
  useKeyboardShortcut,
  usePlayer,
} from "liqvid";
import dynamic from "next/dynamic";
import { useEffect } from "react";

import {
  persistCaptions,
  persistColorScheme,
  persistMute,
  persistVolume,
} from "#lib/persistence";

import { PlaybackSpeed } from "./controls/PlaybackSpeed.tsx";
import { Transcript } from "./controls/Transcript.tsx";
import { shortcuts } from "./shortcuts.ts";

const iconClassName = clsx("h-[calc(var(--lv-controls-height)*0.45)] w-auto");

export const detailClassName = clsx("ml-auto text-right text-white/50");

/** Class name for captions display. Must pass the same value to the captions preview component. */
export const captionsClassName = clsx(
  "absolute bottom-1/8 left-1/2 z-50 -translate-x-1/2 rounded-md bg-black/70 p-2 text-lg text-white",
);

/** Affordance to toggle between light/dark mode */
export function ColorSchemeToggle({ className }: { className?: string }) {
  return (
    <Controls.ColorSchemeToggle
      className={className}
      render={({ colorScheme }, props) => {
        const strings = {
          dark: "Toggle color scheme (currently dark)",
          light: "Toggle color scheme (currently light)",
        };

        return (
          <HydrateVariants
            {...persistColorScheme}
            value={colorScheme}
            variants={[
              {
                children: (
                  <button
                    aria-label={strings.dark}
                    title={strings.dark}
                    {...props}
                  >
                    <MoonIcon className={iconClassName} weight="fill" />
                    Color scheme
                    <span className={detailClassName}>Dark</span>
                  </button>
                ),
                eq: "dark",
              },
              {
                children: (
                  <button
                    aria-label={strings.light}
                    title={strings.light}
                    {...props}
                  >
                    <SunIcon className={iconClassName} weight="fill" />
                    Color scheme
                    <span className={detailClassName}>Light</span>
                  </button>
                ),
                eq: "light",
              },
            ]}
          />
        );
      }}
      shortcuts={shortcuts.colorScheme}
    />
  );
}

/** Fullscreen control */
export function FullScreen() {
  return (
    <Controls.FullScreen
      // require long-hold Escape to exit fullscreen so that Vim mode is usable
      keyboardLock="browser"
      navigationUI="hide"
      render={({ isFullScreen }, props) => {
        const label =
          (isFullScreen ? "Exit full screen" : "Full screen") + " (f)";

        return (
          <button aria-label={label} title={label} {...props}>
            {isFullScreen ? (
              <CornersInIcon className={iconClassName} weight="bold" />
            ) : (
              <CornersOutIcon className={iconClassName} weight="bold" />
            )}
          </button>
        );
      }}
      shortcuts={shortcuts.fullscreen}
    />
  );
}

/** Mute/unmute button */
export function MuteButton() {
  return (
    <Controls.Mute
      persistence={persistMute}
      render={({ muted, volume }, props) => {
        const strings = {
          mute: "Mute (m)",
          unmute: "Unmute (m)",
        };

        return (
          <HydrateVariants
            {...persistMute}
            value={muted}
            variants={{
              false: (
                <button
                  aria-label={strings.mute}
                  title={strings.mute}
                  {...props}
                >
                  <HydrateVariants
                    {...persistVolume}
                    value={volume}
                    variants={[
                      {
                        children: (
                          <SpeakerHighIcon
                            className={iconClassName}
                            weight="fill"
                          />
                        ),
                        gte: 0.5,
                      },
                      {
                        children: (
                          <SpeakerLowIcon
                            className={iconClassName}
                            weight="fill"
                          />
                        ),
                        gt: 0,
                        lt: 0.5,
                      },
                      {
                        children: (
                          <SpeakerNoneIcon
                            className={iconClassName}
                            weight="fill"
                          />
                        ),
                        eq: 0,
                      },
                    ]}
                  />
                </button>
              ),
              true: (
                <button
                  aria-label={strings.unmute}
                  title={strings.unmute}
                  {...props}
                >
                  <SpeakerXIcon className={iconClassName} weight="fill" />
                </button>
              ),
            }}
          />
        );
      }}
      shortcuts={shortcuts.mute}
    />
  );
}

/** Control for playing/pausing */
export function PlayPause() {
  return (
    <Controls.PlayPause
      render={({ paused, seeking }, { ...props }) => {
        const label = (paused || seeking ? "Play" : "Pause") + " (k)";
        return (
          <button aria-label={label} title={label} {...props}>
            {paused || seeking ? (
              <PlayIcon className={iconClassName} weight="fill" />
            ) : (
              <PauseIcon className={iconClassName} weight="fill" />
            )}
          </button>
        );
      }}
      shortcuts={shortcuts.playPause}
    />
  );
}

/** Volume control */
export function VolumeSlider() {
  return (
    <Controls.VolumeSlider
      persistence={persistVolume}
      render={({ volume }, props) => {
        const label = `${volume}% volume`;

        return (
          <HydrateElement
            from={[persistMute, persistVolume]}
            hydrationFn={(node, muted, volume) => {
              node.setAttribute("aria-label", `${volume}% volume`);
              (node as HTMLInputElement).value = String(
                muted ? 0 : volume * 100,
              );
            }}
          >
            <input aria-label={label} {...props} />
          </HydrateElement>
        );
      }}
      shortcuts={shortcuts.volume}
    />
  );
}

/** Toggle captions */
export function CaptionsToggle() {
  return (
    <Controls.Captions.Toggle
      className="lv-controls-captions-toggle lv-controls-button"
      persistence={persistCaptions}
      render={({ enabled }, props) => (
        <HydrateVariants
          {...persistCaptions}
          value={enabled}
          variants={{
            false: (
              <button title="Toggle captions (currently off)" {...props}>
                <ClosedCaptioningIcon />
              </button>
            ),
            true: (
              <button title="Toggle captions (currently on)" {...props}>
                <ClosedCaptioningIcon weight="fill" />
              </button>
            ),
          }}
        />
      )}
      shortcuts={shortcuts.captions}
    />
  );
}

export function FaceToggle({ className }: { className?: string }) {
  const { value: enabled, toggle } = useToggle(true);
  const { domElement } = usePlayer();

  useKeyboardShortcut(shortcuts.toggleFace, toggle);

  useEffect(() => {
    domElement?.classList.toggle("no-face", !enabled);
  }, [domElement, enabled]);

  return (
    <button
      aria-pressed={enabled}
      className={className}
      onClick={toggle}
      title={`Toggle face (${shortcuts.toggleFace})`}
      type="button"
    >
      {enabled ? <SmileyIcon weight="fill" /> : <SmileyXEyesIcon />}
      Face
    </button>
  );
}

/**
 * Additional settings in a menu.
 */
export function AdditionalSettings({
  transcript,
}: {
  transcript?: Awaitable<RichTranscript>;
}) {
  const buttonClass = clsx(
    "flex w-full cursor-pointer items-center gap-2 bg-black/85 px-2 py-1 text-sm hover:bg-black/70",
  );

  const player = usePlayer();

  const {
    value: transcriptOpen,
    set: setTranscriptOpen,
    toggle: toggleTranscript,
  } = useToggle(false);

  const {
    value: captionsEditorOpen,
    set: setCaptionsEditorOpen,
    toggle: toggleCaptionsEditor,
  } = useToggle(false);

  useKeyboardShortcut(shortcuts.transcript, toggleTranscript);

  return (
    <>
      <Menu.Root
        onOpenChange={(isOpen) => {
          player.domElement?.classList.toggle("settings-open", isOpen);
        }}
      >
        <Menu.Trigger className="lv-controls-button">
          <GearIcon weight="fill" />
        </Menu.Trigger>
        {/* keepMounted is needed for keyboard shortcuts to work */}
        <Menu.Portal keepMounted>
          <Menu.Positioner
            align="end"
            className="z-50"
            side="top"
            sideOffset={8}
          >
            <Menu.Popup className="translate-0 relative block w-44 overflow-hidden rounded-sm text-white">
              {/* face */}
              <Menu.Item closeOnClick={false}>
                <FaceToggle className={buttonClass} />
              </Menu.Item>

              {/* color scheme */}
              <Menu.Item closeOnClick={false}>
                <ColorSchemeToggle className={buttonClass} />
              </Menu.Item>

              {/* captions */}
              <Menu.Item closeOnClick={false}>
                <Controls.Captions.Toggle
                  className={buttonClass}
                  persistence={persistCaptions}
                  render={({ enabled }, props) => (
                    <button
                      title={`Toggle captions (${shortcuts.captions})`}
                      {...props}
                    >
                      <ClosedCaptioningIcon
                        weight={enabled ? "fill" : "regular"}
                      />
                      Captions
                    </button>
                  )}
                  shortcuts={shortcuts.captions}
                />
              </Menu.Item>

              {/* transcript */}
              {transcript && (
                <Menu.Item className={buttonClass} onClick={toggleTranscript}>
                  <SubtitlesIcon /> Transcript
                </Menu.Item>
              )}

              {/* transcript/captions editor (automatically omitted from production) */}
              {transcript && (
                <Menu.Item
                  className={buttonClass}
                  onClick={toggleCaptionsEditor}
                >
                  <NotePencilIcon /> Captions Editor
                </Menu.Item>
              )}

              {/* playback speed */}
              <PlaybackSpeed buttonClass={buttonClass} />
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      {transcript && (
        <Transcript
          {...{ buttonClass, transcript }}
          onOpenChange={setTranscriptOpen}
          open={transcriptOpen}
        />
      )}

      {transcript && (
        <CaptionsEditorDevOnly
          onOpenChange={setCaptionsEditorOpen}
          open={captionsEditorOpen}
          transcript={transcript}
        />
      )}
    </>
  );
}

const CaptionsEditorDevOnly = dynamic(async () => {
  if (process.env.NODE_ENV === "production") {
    return {
      default: () => null,
    };
  }

  const { CaptionsEditor } = await import("@liqvid/studio");

  return {
    default: ({
      transcript,
      ...props
    }: { transcript: Awaitable<RichTranscript> } & React.ComponentProps<
      typeof Dialog.Root
    >) => (
      <Dialog.Root {...props}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60" />
          <Dialog.Popup
            className={clsx(
              "fixed top-2/5 left-1/2 z-2000 -translate-x-1/2 -translate-y-1/2",
            )}
          >
            <CaptionsEditor
              displayProps={{ className: clsx(captionsClassName) }}
              transcript={transcript}
            />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    ),
  };
});
