"use client";

import type { AspectRatio } from "@liqvid/schemas";
import { type CleanUpFn, createUniqueContext } from "@liqvid/utils";
import { useContext } from "react";

export type ControlsState = Readonly<{
  /** whether the `<Controls>` component has been mounted in the DOM */
  mounted: boolean;

  /** whether controls are currently visible */
  visible: boolean;
}>;

export type RenderingTask = Readonly<{
  /** whether this is currently onscreen */
  visible: boolean;
}>;

export type PlayerContext = Readonly<{
  aspectRatio: AspectRatio;

  controls: ControlsState;

  /** the DOM element of the player root */
  domElement: HTMLElement | null;

  renderingTasks: Set<RenderingTask>;
  registerRenderingTask(task: RenderingTask): CleanUpFn;
}>;

export const PlayerContext = createUniqueContext<PlayerContext>(
  "@liqvid/player",
  {
    aspectRatio: { height: 9, width: 16 },
    controls: { mounted: false, visible: false },
    domElement: null,
    registerRenderingTask: () => () => {},
    renderingTasks: new Set(),
  },
);

export function usePlayerOptional() {
  return useContext(PlayerContext);
}

export function usePlayer() {
  const value = useContext(PlayerContext);
  if (value === null) {
    throw new Error("usePlayer() must be used within a <PlayerProvider>.");
  }
  return value;
}
