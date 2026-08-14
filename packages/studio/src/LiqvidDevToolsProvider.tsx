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
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { clientRuntime, LiqvidStudioApiClient } from "./client.mts";
import type { ToastPropsWithTime } from "./ui/Toast.tsx";
import { Toaster } from "./ui/Toaster.tsx";
import "./palette.css";

import type { RelativeDir } from "effect-paths";

import { WebSocketProvider } from "./components/WebSocketProvider.tsx";

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
  plugins?: LiqvidStudioPlugin[];
}) {
  const projectPath = useProjectPath();
  const projectParams = useProjectParams();
  const [instances] = useState<Record<string, Set<unknown>>>(() => ({}));
  const privateContext = useMemo(
    () => ({ instances, projectPath }),
    [projectPath, instances],
  );

  const [toasts, setToasts] = useState<ToastPropsWithTime[]>([]);
  const api = useMemo(
    (): Omit<PluginContext, "plugins"> => ({
      makeToast(toast) {
        setToasts((prev) => [...prev, { ...toast, time: Date.now() }]);
      },
      registerInstance(pluginName, instance) {
        instances[pluginName] ??= new Set();
        instances[pluginName].add(instance);
        return () => {
          instances[pluginName]?.delete(instance);
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
                projectPath,
                params:
                  Object.keys(projectParams).length > 0
                    ? JSON.stringify(projectParams)
                    : undefined,
              },
            });
          }),
        );
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
    if (!playback) return;
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
              if (!plugin.useConfigurePlugin) return null;
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
