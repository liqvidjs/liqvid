"use client";

import { Duration, type DurationLike } from "@liqvid/duration";
import { usePlaybackEvent, usePlaybackOptional } from "@liqvid/playback/react";
import { type RecordingPlugin, RecordingProvider } from "@liqvid/recording";
import {
  type LiqvidStudioPlugin,
  LiqvidStudioPluginApiProvider,
  type PluginContext,
  useProjectParams,
  useProjectPath,
} from "@liqvid/studio-plugin-api";
import { Effect } from "effect";
import type { RelativeDir } from "effect-paths";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ToastPropsWithTime } from "#_/ui/Toast";
import { Toaster } from "#_/ui/Toaster";

import { clientRuntime, LiqvidStudioApiClient } from "../../client.ts";
import { WebSocketProvider } from "../WebSocketProvider.tsx";

import "../../palette.css";

const EMPTY_INSTANCES: readonly unknown[] = Object.freeze([]);

export interface StudioPrivateContextShape {
  instances: Record<string, Set<unknown>>;
  projectPath: RelativeDir;
}

export const StudioPrivateContext = createContext<StudioPrivateContextShape>({
  instances: {},
  projectPath: "" as RelativeDir,
});
StudioPrivateContext.displayName = "LiqvidStudio";

export function useStudioPrivateApi() {
  return useContext(StudioPrivateContext);
}

export function LiqvidDevToolsProvider({
  children,
  plugins,
}: {
  children?: React.ReactNode;
  plugins?: readonly LiqvidStudioPlugin[];
}) {
  const projectPath = useProjectPath();
  const projectParams = useProjectParams();
  const [instances] = useState<Record<string, Set<unknown>>>(() => ({}));
  const instanceSnapshots = useRef<Record<string, readonly unknown[]>>({});
  const instanceListeners = useRef(new Map<string, Set<() => void>>());
  const privateContext = useMemo(
    () => ({ instances, projectPath }),
    [projectPath, instances],
  );

  const [toasts, setToasts] = useState<ToastPropsWithTime[]>([]);
  const api = useMemo(
    (): Omit<PluginContext, "plugins"> => ({
      getInstances(pluginName) {
        return instanceSnapshots.current[pluginName] ?? EMPTY_INSTANCES;
      },
      makeToast(toast) {
        setToasts((prev) => [...prev, { ...toast, time: Date.now() }]);
      },
      registerInstance(pluginName, instance) {
        instances[pluginName] ??= new Set();
        instances[pluginName].add(instance);
        instanceSnapshots.current[pluginName] = Array.from(
          instances[pluginName],
        );
        for (const listener of instanceListeners.current.get(pluginName) ??
          []) {
          listener();
        }
        return () => {
          if (instances[pluginName]?.delete(instance)) {
            instanceSnapshots.current[pluginName] = Array.from(
              instances[pluginName],
            );
            for (const listener of instanceListeners.current.get(pluginName) ??
              []) {
              listener();
            }
          }
        };
      },
      setDuration: (duration: DurationLike) => {
        clientRuntime.runFork(
          Effect.gen(function* () {
            const client = yield* LiqvidStudioApiClient;

            yield* client.projects.setProjectMeta({
              payload: {
                durationMs: Duration.inMilliseconds(duration),
              },
              query: {
                params: JSON.stringify(projectParams),
                projectPath,
              },
            });
          }),
        );
      },
      subscribeInstances(pluginName, listener) {
        let listeners = instanceListeners.current.get(pluginName);
        if (!listeners) {
          listeners = new Set();
          instanceListeners.current.set(pluginName, listeners);
        }
        listeners.add(listener);
        return () =>
          instanceListeners.current.get(pluginName)?.delete(listener);
      },
    }),
    [instances, projectParams, projectPath],
  );

  const recordingPlugins = useMemo(
    () =>
      (plugins ?? []).reduce((acc, plugin) => {
        if ("recorder" in plugin) {
          acc.push(plugin as RecordingPlugin);
        }

        return acc;
      }, [] as RecordingPlugin[]),
    [plugins],
  );

  // update duration
  const playback = usePlaybackOptional();

  const updateDuration = useCallback(() => {
    if (!playback) {
      return;
    }
    api.setDuration(playback.duration$);
  }, [api, playback]);

  useEffect(() => updateDuration(), [updateDuration]);

  usePlaybackEvent("durationchange", updateDuration);

  return (
    <WebSocketProvider>
      <LiqvidStudioPluginApiProvider plugins={plugins} value={api}>
        <RecordingProvider plugins={recordingPlugins}>
          <StudioPrivateContext.Provider value={privateContext}>
            {plugins?.map((plugin) => {
              if (!plugin.useConfigurePlugin) {
                return null;
              }
              return (
                <CallHook
                  key={plugin.package}
                  usePlugin={plugin.useConfigurePlugin}
                />
              );
            })}
            {children}
          </StudioPrivateContext.Provider>
          <Toaster {...{ toasts }} />
        </RecordingProvider>
      </LiqvidStudioPluginApiProvider>
    </WebSocketProvider>
  );
}

function CallHook({ usePlugin }: { usePlugin: () => void }) {
  usePlugin();
  return null;
}
