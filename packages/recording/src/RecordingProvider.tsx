import { createUniqueContext } from "@liqvid/utils";
import { useContext, useMemo, useReducer, useState } from "react";

import { RecordingManager } from "./RecordingManager.ts";
import type { Recorder } from "./recorder.ts";
import type { RecordingPlugin } from "./types.ts";

export interface RecordingContext {
  /** Discard the current recording without saving it */
  discard: () => void;

  enabledPlugins: Record<string, boolean>;
  manager: RecordingManager;

  /** Pause recording if currently active, or resume recording if currently paused. */
  pauseResume: () => void;

  plugins: Record<string, RecordingPlugin<unknown>>;

  recordings: unknown[];

  /** Register a recording plugin */
  registerPlugin: (plugin: RecordingPlugin) => () => void;

  /** Start recording if currently idle, or stop and save recording if currently active */
  startStop: () => void;

  /** Enable or disable a recording plugin. */
  togglePlugin: (
    pluginId: string,

    /**
     * Pass a boolean to explicitly enable or disable a plugin.
     * If nothing is passed, will toggle between enabled/disabled.
     */
    enabled?: boolean,
  ) => void;
}

export const RecordingContext = createUniqueContext<RecordingContext>(
  "@liqvid/recording",
  {
    discard() {},
    enabledPlugins: {},
    get manager(): RecordingManager {
      throw new Error("must be called inside <RecordingProvider>");
    },
    pauseResume() {},
    plugins: {},
    recordings: [],
    registerPlugin: () => () => {},
    startStop() {},
    togglePlugin() {},
  },
);
RecordingContext.displayName = "Recording";

/**
 * Access the ambient Recording API.
 */
export function useRecordingApi(): RecordingContext {
  return useContext(RecordingContext);
}

type EnabledPlugins = Record<
  string,
  [enabled: boolean, plugin: RecordingPlugin]
>;

type Action =
  | { kind: "newPlugin"; plugin: RecordingPlugin }
  | { kind: "removePlugin"; pluginId: string }
  | { enabled?: boolean; kind: "toggle"; pluginId: string };

function reducer(prev: EnabledPlugins, action: Action): EnabledPlugins {
  switch (action.kind) {
    case "newPlugin": {
      return {
        ...prev,
        [action.plugin.package]: [false, action.plugin],
      };
    }
    case "removePlugin": {
      const copy = { ...prev };
      delete copy[action.pluginId];
      return copy;
    }
    case "toggle": {
      const [prevEnabled, plugin] = prev[action.pluginId]!;
      const newEnabled =
        typeof action.enabled === "undefined" ? !prevEnabled : action.enabled;
      return {
        ...prev,
        [action.pluginId]: [newEnabled, plugin],
      };
    }
  }
}

function computeInitialState(plugins: RecordingPlugin[]): EnabledPlugins {
  return plugins.reduce((acc, curr) => {
    acc[curr.package] = [false, curr];
    return acc;
  }, {} as EnabledPlugins);
}

/**
 * Provide the Recording API to descendants.
 */
export function RecordingProvider({
  children,
  manager: propsManager,
  plugins: propPlugins,
}: {
  children?: React.ReactNode;
  manager?: RecordingManager;
  plugins?: RecordingPlugin[];
}) {
  const [stateManager] = useState(() => new RecordingManager());
  const manager = propsManager ?? stateManager;

  const [state, dispatch] = useReducer(
    reducer,
    propPlugins ?? [],
    computeInitialState,
  );

  const context = useMemo(
    (): RecordingContext => ({
      async discard() {
        manager.cancelRecording();
      },
      enabledPlugins: new Proxy(state, {
        get(target, pluginId: string) {
          // warning: pluginId can be `toJSON`!
          return target[pluginId]?.[0];
        },
      }) as unknown as RecordingContext["enabledPlugins"],
      manager,
      pauseResume() {
        manager.paused ? manager.resumeRecording() : manager.pauseRecording();
      },
      plugins: new Proxy(state, {
        get(target, pluginId: string) {
          // warning: pluginId can be `toJSON`!
          return target[pluginId]?.[1];
        },
      }) as unknown as RecordingContext["plugins"],
      recordings: [],
      registerPlugin(plugin: RecordingPlugin) {
        dispatch({ kind: "newPlugin", plugin });

        return () => {
          // TODO: count instances
          dispatch({ kind: "removePlugin", pluginId: plugin.package });
        };
      },
      startStop() {
        if (manager.active) {
          manager.endRecording();
        } else {
          const recordersMap = Object.entries(state).reduce(
            (acc, [pluginId, [enabled, { recorder }]]) => {
              if (enabled) {
                acc[pluginId] = recorder;
              }
              return acc;
            },
            {} as Record<string, Recorder>,
          );
          manager.beginRecording(recordersMap);
        }
      },
      togglePlugin(pluginId: string, enabled?: boolean) {
        dispatch({ enabled, kind: "toggle", pluginId: pluginId });
      },
    }),
    [manager, state],
  );

  return (
    <RecordingContext.Provider value={context}>
      {children}
    </RecordingContext.Provider>
  );
}
