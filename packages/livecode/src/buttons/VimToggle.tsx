"use client";

import {
  type BooleanValueConfig,
  type ClientValueSource,
  HydrateElement,
  usePersist,
} from "@liqvid/hydration";
import { vim } from "@replit/codemirror-vim";
import classNames from "classnames";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";

import { vimCompartment } from "../extensions";
import { useLiveCodeShortcut } from "../hooks";
import { useLiveCodeStore } from "../store";

export const persistVim = {
  default: false,
  name: "liqvid.livecode.vim",
  source: "localStorage",
  type: "boolean",
} satisfies BooleanValueConfig;

/** Toggle Vim mode (requires `@replit/codemirror-vim`). */
export function VimToggle({
  className,
  defaultEnabled = false,
  persistence,
  shortcut,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  defaultEnabled?: boolean;

  persistence?: {
    default?: boolean;
    name: string;
    source?: ClientValueSource;
  };

  /** Keyboard shortcut to toggle Vim mode. */
  shortcut?: string;
}) {
  const getActiveView = useStore(
    useLiveCodeStore(),
    (state) => state.getActiveView,
  );

  // persistence
  const vimPersistenceConfig = useMemo((): BooleanValueConfig | undefined => {
    if (!persistence?.name) return undefined;

    return {
      default: persistence.default ?? defaultEnabled,
      name: persistence.name,
      source: persistence.source ?? "localStorage",
      type: "boolean",
    };
  }, [
    defaultEnabled,
    persistence?.default,
    persistence?.name,
    persistence?.source,
  ]);

  const [getEnabled, setPersistedEnabled] = usePersist(vimPersistenceConfig!, {
    disabled: !vimPersistenceConfig,
  });

  const [isVimActive, setVimActive] = useState(() => {
    if (persistence) {
      const persisted = getEnabled();
      return persisted ?? defaultEnabled;
    }
    return defaultEnabled;
  });

  // Persist enabled state when it changes
  useEffect(() => {
    if (persistence) {
      setPersistedEnabled(isVimActive);
    }
  }, [isVimActive, persistence, setPersistedEnabled]);

  const toggleVimActive = useCallback(() => setVimActive((prev) => !prev), []);

  // keyboard shortcut
  useLiveCodeShortcut(
    shortcut,
    useCallback(() => {
      toggleVimActive();
      return true;
    }, [toggleVimActive]),
  );

  useEffect(() => {
    getActiveView().dispatch({
      effects: vimCompartment.reconfigure(isVimActive ? vim() : []),
    });
  }, [getActiveView, isVimActive]);

  const content = (
    <button
      aria-checked={isVimActive}
      className={classNames("lqv-livecode-vim", className)}
      onClick={toggleVimActive}
      role="switch"
      {...props}
    />
  );

  if (vimPersistenceConfig) {
    return (
      <HydrateElement
        from={[vimPersistenceConfig]}
        hydrationFn={(node, enabled) => {
          node.setAttribute("aria-checked", String(enabled));
        }}
      >
        {content}
      </HydrateElement>
    );
  }

  return content;
}
