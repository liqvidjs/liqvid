"use client";

import {
  type BooleanValueConfig,
  type ClientValueSource,
  HydrateElement,
  usePersistentState,
} from "@liqvid/hydration";
import { vim } from "@replit/codemirror-vim";
import clsx from "clsx";
import { useCallback, useEffect, useMemo } from "react";

import { vimCompartment } from "../extensions.ts";
import { useActiveFile, useLiveCodeShortcut } from "../hooks.ts";

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
  const activeFile = useActiveFile();

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

  const [isVimActive, _setVimActive, toggleVimActive] = usePersistentState(
    vimPersistenceConfig!,
    {
      disabled: !vimPersistenceConfig,
    },
  );

  // keyboard shortcut
  useLiveCodeShortcut(
    shortcut,
    useCallback(() => {
      toggleVimActive();
      return true;
    }, [toggleVimActive]),
  );

  useEffect(() => {
    activeFile?.view.dispatch({
      effects: vimCompartment.reconfigure(isVimActive ? vim() : []),
    });
  }, [activeFile, isVimActive]);

  const content = (
    <button
      aria-checked={isVimActive}
      className={clsx("lqv-livecode-vim", className)}
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
