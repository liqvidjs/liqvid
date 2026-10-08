"use client";

import type { ColorScheme } from "@liqvid/color-scheme/react";
import type { IFrameAPIDeclaration } from "@liqvid/iframe-api";
import type { ShortcutsSpecifier } from "@liqvid/keymap";
import type { RenderMode } from "@lqv/playback/react";

/**
 * Type-level carrier for a value of type `T`. The runtime never reads this
 * value; it exists only so the declaration can describe argument and return
 * types without any validation library.
 */
function type<T>(): T {
  return undefined as T;
}

/**
 * API declaration for Liqvid player iframe communication.
 *
 * The `arguments`/`return` fields are type-level carriers only; the runtime
 * reads method names, not their values.
 */
export const playerApiDeclaration = {
  methods: {
    /** Get the duration of the video in seconds */
    getDuration: {
      arguments: type<[]>(),
      return: type<number>(),
    },

    /** Get the keyboard shortcuts handled by the player */
    getKeyboardShortcuts: {
      arguments: type<[]>(),
      return: type<readonly PlayerKeyboardShortcut[]>(),
    },

    /** Dispatch a keyboard shortcut received by the embedding page */
    handleKeyboardShortcut: {
      arguments: type<[shortcut: string]>(),
      return: type<void>(),
    },

    /** Seek to a specific time in seconds */
    seekTo: {
      arguments: type<[time: number]>(),
      return: type<void>(),
    },

    /** Set the color scheme */
    setColorScheme: {
      arguments: type<[colorScheme: ColorScheme]>(),
      return: type<void>(),
    },

    /** Set the render mode */
    setRenderMode: {
      arguments: type<[renderMode: RenderMode]>(),
      return: type<void>(),
    },

    /** Toggle the captions */
    toggleCaptions: {
      arguments: type<[show?: boolean]>(),
      return: type<void>(),
    },

    /** Toggle the controls */
    toggleControls: {
      arguments: type<[show?: boolean]>(),
      return: type<void>(),
    },
  },
  namespace: "@liqvid/player",
} satisfies IFrameAPIDeclaration;

export type PlayerApiDeclaration = typeof playerApiDeclaration;

export type PlayerKeyboardShortcut = {
  description?: string;
  shortcut: ShortcutsSpecifier;
};
