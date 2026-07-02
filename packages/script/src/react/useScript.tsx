"use client";

import { KeymapProvider, useKeyboardShortcut } from "@liqvid/keymap/react";
import { makeContext } from "@liqvid/utils";

import type { Script } from "../script.mts";

const ScriptContext = makeContext<Script<string> | null>({
  defaultValue: null,
  name: "Script",
  uniqueKey: "@liqvid/script",
});

/** Access the ambient {@link Script}, or null if none available. */
export const useScriptOptional = <M extends string>() =>
  ScriptContext.useOptional() as Script<M> | null;

/** Access the ambient {@link Script}. */
export const useScript = <M extends string>() =>
  ScriptContext.use() as unknown as Script<M>;

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
  script: Script<M> | undefined;

  /** Keyboard shortcuts for navigating between markers. */
  shortcuts?: ScriptShortcuts;
}) {
  const inheritedValue = useScriptOptional();

  const context = propsScript ?? inheritedValue;

  // If shortcuts are passed but no keymap is available, create one
  const needsKeymap = shortcuts;

  const content = (
    <ScriptContext.Provider value={context as unknown as Script<string> | null}>
      {context && shortcuts && <ScriptShortcutsHandler shortcuts={shortcuts} />}
      {children}
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
