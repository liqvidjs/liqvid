"use client";

import { createUniqueContext } from "@liqvid/utils";
import { useContext } from "react";

import type { ControlsState } from "./hooks";

export type PrivatePlayerContext = {
  setControls: React.Dispatch<React.SetStateAction<ControlsState>>;
};

export const PrivatePlayerContext = createUniqueContext<PrivatePlayerContext>(
  "@liqvid/player/private-api",
  {
    setControls: () => {},
  },
);

export function usePrivatePlayerApi(): PrivatePlayerContext {
  return useContext(PrivatePlayerContext);
}
