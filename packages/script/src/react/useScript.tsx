"use client";

import { KeymapProvider, useKeyboardShortcut } from "@liqvid/keymap/react";
import { PlaybackProvider } from "@liqvid/playback/react";
import { createContext, useContext } from "react";

import type { Script } from "../script.mts";

export const ScriptContext = createContext<Script<string> | null>(null);

export function useScriptOptional<
  M extends string = string,
>(): Script<M> | null {
  return useContext(ScriptContext) as Script<M> | null;
}

export function useScript<M extends string = string>(): Script<M> {
  const script = useScriptOptional<M>();

  if (!script) {
    throw new Error("missing script");
  }

  return script;
}

/** Shortcuts for navigating between markers. */
export interface ScriptShortcuts {
  /** Go to the previous marker. */
  back?: string | string[];

  /** Go to the next marker. */
  forward?: string | string[];
}

export function ScriptProvider<M extends string>({
  children,
  script: propsScript,
  shortcuts,
}: {
  children?: React.ReactNode;
  script?: Script<M>;

  /** Keyboard shortcuts for navigating between markers. */
  shortcuts?: ScriptShortcuts;
}) {
  const inheritedValue = useScriptOptional();

  const context = propsScript ?? inheritedValue;

  if (!context) {
    throw new Error("missing script");
  }

  // If shortcuts are passed but no keymap is available, create one
  const needsKeymap = shortcuts;

  const content = (
    <ScriptContext.Provider value={context as unknown as Script<string>}>
      <PlaybackProvider value={context.playback}>
        {shortcuts && <ScriptShortcutsHandler shortcuts={shortcuts} />}
        {children}
      </PlaybackProvider>
    </ScriptContext.Provider>
  );

  if (needsKeymap) {
    return <KeymapProvider>{content}</KeymapProvider>;
  }

  return content;
}

function ScriptShortcutsHandler({ shortcuts }: { shortcuts: ScriptShortcuts }) {
  const script = useScript();
  useKeyboardShortcut(shortcuts.back, script.back);
  useKeyboardShortcut(shortcuts.forward, script.forward);

  return null;
}
