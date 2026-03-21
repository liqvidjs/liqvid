"use client";

import { type ColorScheme, useColorScheme } from "@liqvid/color-scheme/react";
import { HydrateElement } from "@liqvid/hydration";
import { provideIframeApi } from "@liqvid/iframe-api/child";
import { KeymapProvider } from "@liqvid/keymap/react";
import type { Playback } from "@liqvid/playback";
import { usePlaybackOptional } from "@liqvid/playback/react";
import { combineRefs } from "@liqvid/utils";
import classNames from "classnames";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type AspectRatioSpecifier,
  normalizeAspectRatio,
} from "./aspect-ratio";
import { Canvas } from "./Canvas";
import { Controls } from "./Controls";
import { PlayerContext, type RenderingTask } from "./hooks";
import { playerApiDeclaration } from "./iframe-api";

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

  const [renderingTasks, setRenderingTasks] = useState<Set<RenderingTask>>(
    () => new Set(),
  );

  const captureKeys = useRef(true);

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

  // Initialize iframe API for postMessage communication
  useEffect(() => {
    if (!playback) return;

    return provideIframeApi(playerApiDeclaration, {
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
    });
  }, [playback, setColorScheme]);

  const inner = (
    <div
      className={classNames("lv-player", className)}
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
    <KeymapProvider shouldHandle={() => captureKeys.current}>
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

export function Captions({
  className,
  children,
  ...props
}: { children?: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <div className={classNames("lv-captions", className)} {...props}>
      {children}
    </div>
  );
}

export const Player = { Canvas, Captions, Controls, Root };
