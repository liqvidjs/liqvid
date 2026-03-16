"use client";

import { Duration, type DurationLike } from "@liqvid/duration";
import { type RecordingPlugin, RecordingProvider } from "@liqvid/recording";
import {
  type LiqvidStudioPlugin,
  LiqvidStudioPluginApiProvider,
  type PluginContext,
} from "@liqvid/studio-plugin-api";
import { createContext, useContext, useMemo, useState } from "react";

import { setProjectMeta } from "./client.mts";
import type { ToastPropsWithTime } from "./ui/Toast";
import { Toaster } from "./ui/Toaster";

import "./palette.css";

export interface ProjectContextShape {
  projectPath: string;
}

export const ProjectContext = createContext<ProjectContextShape>({
  projectPath: "",
});

export function useProjectContext() {
  return useContext(ProjectContext);
}

export function LiqvidDevToolsProvider({
  children,
  plugins,
  projectPath,
}: {
  children?: React.ReactNode;
  plugins?: LiqvidStudioPlugin[];
  projectPath: string;
}) {
  const projectContext = useMemo(() => ({ projectPath }), [projectPath]);

  const [toasts, setToasts] = useState<ToastPropsWithTime[]>([]);
  const api = useMemo(
    (): Partial<PluginContext> => ({
      makeToast(toast) {
        setToasts((prev) => [...prev, { ...toast, time: Date.now() }]);
      },
      setDuration: (duration: DurationLike) => {
        setProjectMeta({
          body: {
            durationMs: Duration.from(duration).inMilliseconds(),
          },
          search: {
            url: projectPath,
          },
        });
      },
    }),
    [projectPath],
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

  return (
    <LiqvidStudioPluginApiProvider plugins={plugins} value={api}>
      <RecordingProvider plugins={recordingPlugins}>
        <ProjectContext.Provider value={projectContext}>
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
        </ProjectContext.Provider>
        <Toaster {...{ toasts }} />
      </RecordingProvider>
    </LiqvidStudioPluginApiProvider>
  );
}

function CallHook({ usePlugin }: { usePlugin: () => void }) {
  usePlugin();
  return null;
}
