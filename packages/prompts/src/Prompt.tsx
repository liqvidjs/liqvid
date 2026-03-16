import {
  HydrateElement,
  type StringValueConfig,
  usePersist,
} from "@liqvid/hydration";
import { onDragReact } from "@liqvid/utils";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Cue } from "./Cue";
import { usePromptsApi } from "./PromptsProvider";

const NS = "lv-prompt";

interface PromptPosition {
  left: string;
  top: string;
}

/**
 * Container for {@link Cue}s
 */
export function Prompt({
  children,
  name,
  ...props
}: React.HTMLAttributes<HTMLDListElement> & {
  children?: React.ReactNode;
  /**
   * Unique identifier for this prompt. When provided and persistence is
   * configured in the PromptsProvider, the prompt's position will be
   * persisted to storage.
   */
  name?: string;
}) {
  const { enabled, persistence } = usePromptsApi();
  const [ref, setRef] = useState<HTMLDListElement | null>(null);

  // Set up persistence for this prompt's position
  const persistenceConfig = useMemo((): StringValueConfig | undefined => {
    if (!persistence || !name) return undefined;
    return {
      name: `${persistence.prefix}${name}`,
      source: persistence.source ?? "localStorage",
      type: "string",
    };
  }, [persistence, name]);

  const [getPosition, setPosition] = usePersist(persistenceConfig!, {
    disabled: !persistenceConfig,
  });

  // Parse position from storage
  const parsePosition = useCallback(
    (value: string | null): PromptPosition | null => {
      if (!value) return null;
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed.left === "string" && typeof parsed.top === "string") {
          return parsed as PromptPosition;
        }
      } catch {
        // Invalid JSON, ignore
      }
      return null;
    },
    [],
  );

  // Save position to storage
  const savePosition = useCallback(
    (left: string, top: string) => {
      if (persistenceConfig) {
        setPosition(JSON.stringify({ left, top }));
      }
    },
    [persistenceConfig, setPosition],
  );

  useEffect(() => {
    if (!ref) return;

    // Try to restore position from storage
    const savedPosition = parsePosition(getPosition());
    if (savedPosition) {
      Object.assign(ref.style, {
        left: savedPosition.left,
        top: savedPosition.top,
      });
    } else if (!ref.style.left) {
      Object.assign(ref.style, {
        left: "0%",
        top: "0%",
      });
    }
  }, [getPosition, parsePosition, ref]);

  const dragEvents = useMemo(() => {
    let lastX: number, lastY: number;
    return onDragReact(
      (_e, hit) => {
        if (!ref) return;

        const offset = offsetParent(ref);

        const x = offset.left + hit.x - lastX,
          y = offset.top + hit.y - lastY,
          left = (x / offset.width) * 100,
          top = (y / offset.height) * 100;

        lastX = hit.x;
        lastY = hit.y;

        Object.assign(ref.style, {
          left: `${left}%`,
          top: `${top}%`,
        });
      },
      (_e, hit) => {
        lastX = hit.x;
        lastY = hit.y;
      },
      // On drag end, save the position
      () => {
        if (ref) {
          savePosition(ref.style.left, ref.style.top);
        }
      },
    );
  }, [ref, savePosition]);

  // avoid hydration errors
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  if (!isMounted) return null;

  if (!enabled) {
    return null;
  }

  const content = (
    <dl className={NS} {...props} {...dragEvents} ref={setRef}>
      {children}
    </dl>
  );

  if (persistenceConfig) {
    return (
      <HydrateElement
        from={[persistenceConfig]}
        hydrationFn={(node, positionStr) => {
          try {
            const { left, top } = JSON.parse(positionStr);
            node.setAttribute("style", `left: ${left}; top: ${top}`);
          } catch (_e) {}
        }}
      >
        {content}
      </HydrateElement>
    );
  }

  return content;
}

function offsetParent(node: HTMLElement) {
  if (
    typeof node.offsetLeft !== "undefined" &&
    typeof node.offsetTop !== "undefined" &&
    node.offsetParent
  ) {
    return {
      height: node.offsetParent.getBoundingClientRect().height,
      left: node.offsetLeft,
      top: node.offsetTop,
      width: node.offsetParent.getBoundingClientRect().width,
    };
  }

  const rect = node.getBoundingClientRect();

  let parent = node;
  // biome-ignore lint/suspicious/noAssignInExpressions: this is fine
  while ((parent = parent.parentNode as HTMLElement)) {
    if (!["absolute", "relative"].includes(getComputedStyle(parent).position))
      continue;

    const prect = parent.getBoundingClientRect();

    return {
      height: prect.height,
      left: rect.left - prect.left,
      top: rect.top - prect.top,
      width: prect.width,
    };
  }

  return {
    height: innerHeight,
    left: rect.left,
    top: rect.top,
    width: innerWidth,
  };
}
