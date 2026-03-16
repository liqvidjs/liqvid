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

export function ScriptProvider<M extends string>({
  children,
  script: propsScript,
}: {
  children?: React.ReactNode;
  script?: Script<M>;
}) {
  const inheritedValue = useScriptOptional();

  const context = propsScript ?? inheritedValue;

  if (!context) {
    throw new Error("missing script");
  }

  return (
    <ScriptContext.Provider value={context as unknown as Script<string>}>
      <PlaybackProvider value={context.playback}>{children}</PlaybackProvider>
    </ScriptContext.Provider>
  );
}
