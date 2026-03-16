"use client";

import { createUniqueContext } from "@liqvid/utils";
import { useContext } from "react";

import type { AspectRatio } from "./aspect-ratio";

export interface PlayerContext {
  aspectRatio: AspectRatio;
  domElement: HTMLElement | null;
}

export const PlayerContext = createUniqueContext<PlayerContext>(
  "@liqvid/player",
  {
    aspectRatio: { h: 9, w: 16 },
    domElement: null,
  },
);

export function usePlayer(): PlayerContext {
  return useContext(PlayerContext);
}
