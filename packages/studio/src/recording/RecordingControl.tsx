"use client";

import { useEventListener } from "@liqvid/event-emitter/react";
import { useKeyboardShortcut } from "@liqvid/keymap/react";
import { useRecordingApi } from "@liqvid/recording";
import {
  useIsPreview,
  useProjectParams,
  useProjectPath,
} from "@liqvid/studio-plugin-api";
import { useForceUpdate } from "@liqvid/utils";
import { useCallback, useRef } from "react";

import { saveRecording } from "#_/client.mjs";
import { DockableDialog } from "#_/ui/DockableDialog.js";

import { RecordingDialog } from "./RecordingDialog/RecordingDialog.tsx";

export interface RecordingControlProps {
  shortcuts?: {
    /** Shortcut to toggle the Recording panel */
    toggle?: string;

    /** Shortcut to discard recording */
    discard?: string;

    /** Shortcut to pause recording */
    pause?: string;

    /** Shortcut to start/stop recording */
    startStop?: string;
  };
}

interface FinalizedData {
  data: unknown;
  key: string;
}

/**
 * Liqvid recording control.
 */
export function RecordingControl({ shortcuts }: RecordingControlProps) {
  const { manager, discard, pauseResume, startStop } = useRecordingApi();
  const projectPath = useProjectPath();
  const projectParams = useProjectParams();
  const isPreview = useIsPreview();

  const forceUpdate = useForceUpdate();

  // Collect finalized data from all plugins
  const finalizedDataRef = useRef<FinalizedData[]>([]);

  // recording manager
  useEventListener(
    manager,
    "finalize",
    useCallback(
      (args: { key: string; data: unknown } | undefined) => {
        if (args === undefined) {
          // End signal - save all collected data to server
          const recordingData = finalizedDataRef.current;
          finalizedDataRef.current = [];

          if (recordingData.length > 0) {
            saveRecording({
              body: {
                durationMs: manager.duration.inMilliseconds(),
                // Include project params for parameterized projects
                params:
                  Object.keys(projectParams).length > 0
                    ? projectParams
                    : undefined,
                plugins: recordingData,
              },
              search: { projectPath },
            });
          }
        } else {
          // Individual plugin data - collect it
          finalizedDataRef.current.push(args);
        }
        forceUpdate();
      },
      [forceUpdate, manager, projectParams, projectPath],
    ),
  );
  useEventListener(manager, "start", forceUpdate);
  useEventListener(manager, "pause", forceUpdate);
  useEventListener(manager, "resume", forceUpdate);

  // warn before closing if recordings exist
  useWarnBeforeClosingIfRecordingsExist();

  // active plugins
  const activePlugins = useRef<{ [key: string]: boolean }>(null);
  if (activePlugins.current === null) {
    activePlugins.current = {};

    // for (const plugin of plugins) {
    //   activePlugins.current[plugin.package] = false;
    // }
  }

  // plugins dictionary
  // const [pluginsByKey] = useState(() => {
  //   const dict: Record<string, RecordingPlugin<unknown, unknown>> = {};
  //   // for (const plugin of plugins) {
  //   //   dict[plugin.package] = plugin;
  //   // }
  //   return dict;
  // });

  /* keyboard controls */
  useKeyboardShortcut(shortcuts?.discard, discard);
  useKeyboardShortcut(shortcuts?.pause, pauseResume);
  useKeyboardShortcut(shortcuts?.startStop, startStop);

  // don't render in preview mode
  if (isPreview) return;

  /* render */

  return (
    <DockableDialog.Root name="recording" shortcut={shortcuts?.toggle}>
      <DockableDialog.Trigger asChild>
        <RecordingIndicatorIcon />
      </DockableDialog.Trigger>

      <RecordingDialog shortcuts={shortcuts} />
    </DockableDialog.Root>
  );
}

function useWarnBeforeClosingIfRecordingsExist() {
  const { recordings } = useRecordingApi();
  const warn = useRef(false);
  warn.current = recordings.length > 0;

  useEventListener(
    globalThis?.window,
    "beforeunload",
    useCallback((e: BeforeUnloadEvent) => {
      if (warn.current) e.returnValue = "You have recording data";
    }, []),
  );
}

const colors = {
  active: "red",
  inactive: "#666",
  paused: "yellow",
} satisfies Record<RecordingState, string>;

const labels = {
  active: "Recording in progress",
  inactive: "No recording in progress",
  paused: "Recording is paused",
} satisfies Record<RecordingState, string>;

/**
 * Red when playback is active
 */
function RecordingIndicatorIcon(props: React.SVGAttributes<SVGSVGElement>) {
  const state = useRecordingState();

  return (
    <svg height="36" viewBox="-50 -50 100 100" width="36" {...props}>
      <title>{labels[state]}</title>
      <circle
        cx="0"
        cy="0"
        fill={colors[state]}
        r="35"
        stroke="white"
        strokeWidth="5"
      />
    </svg>
  );
}

type RecordingState = "active" | "inactive" | "paused";

function useRecordingState() {
  const { manager } = useRecordingApi();

  const forceUpdate = useForceUpdate();

  // recording manager
  useEventListener(manager, "cancel", forceUpdate);
  useEventListener(manager, "finalize", forceUpdate);
  useEventListener(manager, "pause", forceUpdate);
  useEventListener(manager, "resume", forceUpdate);
  useEventListener(manager, "start", forceUpdate);

  if (manager?.active) {
    return manager.paused ? "paused" : "active";
  }

  return "inactive";
}
