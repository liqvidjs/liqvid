"use client";

import { createUniqueContext } from "@liqvid/utils";
import { useContext } from "react";

import type { AspectRatio } from "./aspect-ratio";

export type RenderingTask = {
  /** whether this is currently onscreen */
  visible: boolean;
};

export type PlayerContext = {
  aspectRatio: AspectRatio;
  domElement: HTMLElement | null;
  renderingTasks: Set<RenderingTask>;
  registerRenderingTask(task: RenderingTask): () => void;
};

export const PlayerContext = createUniqueContext<PlayerContext>(
  "@liqvid/player",
  {
    aspectRatio: { h: 9, w: 16 },
    domElement: null,
    registerRenderingTask: () => () => {},
    renderingTasks: new Set(),
  },
);

export function usePlayer(): PlayerContext {
  return useContext(PlayerContext);
}
