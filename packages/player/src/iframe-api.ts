"use client";

import type { IFrameAPIDeclaration } from "@liqvid/iframe-api";
import { z } from "zod";

import { RenderMode } from "./render-mode";

/**
 * API declaration for Liqvid player iframe communication.
 */
export const playerApiDeclaration = {
  methods: {
    /** Get the duration of the video in seconds */
    getDuration: {
      arguments: z.tuple([]),
      return: z.number(),
    },

    /** Seek to a specific time in seconds */
    seekTo: {
      arguments: z.tuple([z.number()]),
      return: z.void(),
    },

    /** Set the color scheme */
    setColorScheme: {
      arguments: z.tuple([z.enum(["light", "dark"])]),
      return: z.void(),
    },

    /** Set the render mode */
    setRenderMode: {
      arguments: z.tuple([RenderMode]),
      return: z.void(),
    },

    /** Toggle the controls */
    toggleControls: {
      arguments: z.tuple([z.boolean().optional()]),
      return: z.void(),
    },
  },
  namespace: "@liqvid/player",
} satisfies IFrameAPIDeclaration;

export type PlayerApiDeclaration = typeof playerApiDeclaration;
