"use client";

import type { AspectRatio } from "@liqvid/schemas";
import { type CleanUpFn, createUniqueContext } from "@liqvid/utils";
import { useContext } from "react";

import type { RenderMode } from "./render-mode.ts";

export type RenderingTask = {
  /** whether this is currently onscreen */
  visible: boolean;
};

export type PlayerContext = {
  aspectRatio: AspectRatio;

  /** the DOM element of the player root */
  domElement: HTMLElement | null;

  /**
   * Current rendering mode
   * - `screenshot`: rendering to take a screenshot of one frame
   * - `thumbs`: rendering to generate thumbnails
   * - `video`: static video export
   * - `web`: the default experience
   * */
  renderMode: RenderMode;
  renderingTasks: Set<RenderingTask>;
  registerRenderingTask(task: RenderingTask): CleanUpFn;
};

export const PlayerContext = createUniqueContext<PlayerContext>(
  "@liqvid/player",
  {
    aspectRatio: { height: 9, width: 16 },
    domElement: null,
    registerRenderingTask: () => () => {},
    renderingTasks: new Set(),
    renderMode: "web",
  },
);

export function usePlayer(): PlayerContext {
  return useContext(PlayerContext);
}
