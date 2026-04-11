"use client";

import {
  type BooleanValueConfig,
  type ClientValueSource,
  usePersistentState,
} from "@liqvid/hydration";
import { useKeyboardShortcut } from "@liqvid/keymap/react";
import { createUniqueContext } from "@liqvid/utils";
import { useContext, useMemo } from "react";

export interface PromptsPersistence {
  /**
   * Prefix for storage keys. The full key will be `${prefix}${id}`.
   */
  prefix: string;

  /**
   * Storage source (localStorage, sessionStorage, etc.)
   * @default "localStorage"
   */
  source?: ClientValueSource;
}

export interface PromptsContext {
  enabled: boolean;
  persistence?: PromptsPersistence;
  setEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
}

const promptsContext = createUniqueContext<PromptsContext>("@liqvid/prompts", {
  enabled: true,
  setEnabled() {},
  toggleEnabled() {},
});
promptsContext.displayName = "Prompts";

export function PromptsProvider({
  children,
  defaultEnabled = true,
  persistence,
  shortcut,
}: {
  children?: React.ReactNode;
  defaultEnabled?: boolean;
  /**
   * Configure persistence for prompt positions and enabled state. When
   * provided, prompts with an `id` prop will persist their positions to
   * storage, and the enabled/disabled state will also be persisted.
   */
  persistence?: PromptsPersistence;
  shortcut?: string;
}) {
  // Set up persistence for the enabled state
  const enabledPersistenceConfig = useMemo(():
    | BooleanValueConfig
    | undefined => {
    if (!persistence) return undefined;
    return {
      default: defaultEnabled,
      name: `${persistence.prefix}enabled`,
      source: persistence.source ?? "localStorage",
      type: "boolean",
    };
  }, [persistence, defaultEnabled]);

  const [enabled, setEnabled, toggleEnabled] = usePersistentState(
    enabledPersistenceConfig!,
    {
      disabled: !enabledPersistenceConfig,
    },
  );

  useKeyboardShortcut(shortcut, toggleEnabled);

  const context = useMemo(
    () => ({
      enabled,
      persistence,
      setEnabled,
      toggleEnabled,
    }),
    [enabled, persistence, toggleEnabled, setEnabled],
  );

  return (
    <promptsContext.Provider value={context}>
      {children}
    </promptsContext.Provider>
  );
}

export function usePromptsApi(): PromptsContext {
  return useContext(promptsContext);
}
