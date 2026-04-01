"use client";

import { KeymapProvider, useKeyboardShortcut } from "@liqvid/keymap/react";
import { PlaybackProvider } from "@liqvid/playback/react";
import { makeContext } from "@liqvid/utils";

import type { Script } from "../script.mts";

const ScriptContext = makeContext<Script<string> | null>({
  defaultValue: null,
  name: "Script",
  uniqueKey: "@liqvid/script",
});

/** Access the ambient {@link Script}, or null if none available. */
export const useScriptOptional = ScriptContext.useOptional;

/** Access the ambient {@link Script}. */
export const useScript = ScriptContext.use;

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
