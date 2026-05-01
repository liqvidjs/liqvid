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
} from "./aspect-ratio";
import { Canvas } from "./Canvas";
import { Captions } from "./Captions";
import { Controls } from "./Controls";
import { PlayerContext, type RenderingTask } from "./hooks";
import { playerApiDeclaration } from "./iframe-api";

const API_SYMBOL = Symbol.for("@liqvid/player/api");

export function Root({
  aspectRatio: propsAspectRatio = "video",
  className,
  children,
  playback: propsPlayback,
  ref: forwardedRef = null,
  style,
  ...props
}: {
  aspectRatio?: AspectRatioSpecifier;
  children?: React.ReactNode;
  playback?: Playback;
  ref?: React.Ref<HTMLDivElement>;
} & React.HTMLAttributes<HTMLElement>) {
  const aspectRatio = useMemo(
    () => normalizeAspectRatio(propsAspectRatio),
    [propsAspectRatio],
  );
  const contextPlayback = usePlaybackOptional();
  const playback = propsPlayback ?? contextPlayback;

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
    }),
    [aspectRatio, renderingTasks, registerRenderingTask],
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
    if (ref.current) {
      // biome-ignore lint/suspicious/noExplicitAny: symbol
      (ref.current as any)[API_SYMBOL] = {
        playback,
        setColorScheme: api.setColorScheme,
        toggleControls: api.toggleControls,
      };
    }
  }, [api, playback]);

  const inner = (
    <div
      className={clsx("lv-player", className)}
      data-color-scheme={colorScheme}
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

export const Player = { Canvas, Captions, Controls, Root };
