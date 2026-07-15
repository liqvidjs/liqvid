"use client";

import { type ColorScheme, useColorScheme } from "@liqvid/color-scheme/react";
import { HydrateElement } from "@liqvid/hydration";
import { provideIframeApi } from "@liqvid/iframe-api/child";
import { KeymapProvider } from "@liqvid/keymap/react";
import type { Playback } from "@liqvid/playback";
import { usePlaybackOptional } from "@liqvid/playback/react";
import { combineRefs } from "@liqvid/utils";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type AspectRatioSpecifier,
  normalizeAspectRatio,
} from "./aspect-ratio.ts";
import { Canvas } from "./Canvas.tsx";
import { Controls } from "./Controls.tsx";
import { PlayerContext, type RenderingTask } from "./hooks.ts";
import { playerApiDeclaration } from "./iframe-api.ts";
import type { RenderMode } from "./render-mode.ts";

const API_SYMBOL = Symbol.for("@liqvid/player/api");

export function Root({
  aspectRatio: propsAspectRatio = "video",
  className,
  children,
  playback: propsPlayback,
  ref: forwardedRef = null,
  renderMode: initialRenderMode = "web",
  style,
  ...props
}: {
  aspectRatio?: AspectRatioSpecifier;
  children?: React.ReactNode;
  playback?: Playback;
  ref?: React.Ref<HTMLDivElement>;
  renderMode?: RenderMode;
} & React.HTMLAttributes<HTMLElement>) {
  const aspectRatio = useMemo(
    () => normalizeAspectRatio(propsAspectRatio),
    [propsAspectRatio],
  );
  const contextPlayback = usePlaybackOptional();
  const playback = propsPlayback ?? contextPlayback;

  const [renderMode, setRenderMode] = useState(initialRenderMode);

  if (!playback) {
    throw new Error(
      "No playback instance provided. Provide a playback prop or wrap the Player in a PlaybackProvider.",
    );
  }

  const [renderingTasks, setRenderingTasks] = useState<Set<RenderingTask>>(
    () => new Set(),
  );

  // ref
  const ref = useRef<HTMLDivElement>(null);

  const registerRenderingTask = useCallback((task: RenderingTask) => {
    setRenderingTasks((prev) => new Set(prev).add(task));

    return () => {
      setRenderingTasks((prev) => {
        prev.delete(task);
        return new Set(prev);
      });
    };
  }, []);

  const context = useMemo(
    (): PlayerContext => ({
      aspectRatio,
      get domElement() {
        return ref.current;
      },
      registerRenderingTask,
      renderingTasks,
      renderMode,
    }),
    [aspectRatio, renderingTasks, registerRenderingTask, renderMode],
  );

  const { colorScheme, persistence, setColorScheme } = useColorScheme();

  const api = useMemo(
    () => ({
      getDuration() {
        return playback.duration;
      },
      seekTo(time: number) {
        playback.currentTime = time;
      },
      setColorScheme(colorScheme: ColorScheme) {
        setColorScheme(colorScheme);
      },
      setRenderMode(renderMode: RenderMode) {
        setRenderMode(renderMode);
      },
      toggleControls(visible?: boolean) {
        const controls = ref.current?.querySelector(".lv-controls");
        controls?.toggleAttribute(
          "hidden",
          typeof visible === "boolean" ? !visible : undefined,
        );
      },
    }),
    [playback, setColorScheme],
  );

  // Initialize iframe API for postMessage communication
  // and also symbol API for renderer
  useEffect(() => {
    return provideIframeApi(playerApiDeclaration, api);
  }, [api]);

  useEffect(() => {
    if (!ref.current) return;

    // biome-ignore lint/suspicious/noExplicitAny: symbol
    (ref.current as any)[API_SYMBOL] = {
      playback,
      setColorScheme: api.setColorScheme,
      setRenderMode: api.setRenderMode,
      toggleControls: api.toggleControls,
    };
  }, [api, playback]);

  const inner = (
    <div
      className={clsx("lv-player", className)}
      data-color-scheme={colorScheme}
      data-render-mode={renderMode}
      ref={combineRefs(ref, forwardedRef)}
      style={{
        ...style,
        colorScheme,
      }}
      {...props}
    >
      {children}
    </div>
  );

  return (
    <KeymapProvider>
      <PlayerContext.Provider value={context}>
        {persistence ? (
          <HydrateElement
            from={[persistence]}
            hydrationFn={(node, colorScheme) => {
              const style = node.getAttribute("style");
              if (style?.includes("color-scheme:")) {
                node.setAttribute(
                  "style",
                  style.replace(
                    /color-scheme:[^;]+/,
                    `color-scheme:${colorScheme}`,
                  ),
                );
              } else {
                node.setAttribute("style", `color-scheme:${colorScheme}`);
              }

              node.dataset.colorScheme = colorScheme;
            }}
          >
            {inner}
          </HydrateElement>
        ) : (
          inner
        )}
      </PlayerContext.Provider>
    </KeymapProvider>
  );
}

export const Player = { Canvas, Controls, Root };
