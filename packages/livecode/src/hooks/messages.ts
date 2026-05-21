import { useCallback } from "react";
import type { SetOptional } from "type-fest";

import { type ConsoleMessage, useLiveCodeStore } from "../store.ts";

export function useAddMessage() {
  const store = useLiveCodeStore();

  return useCallback(
    <M extends ConsoleMessage<unknown, string>>(
      message: SetOptional<M, "timestamp">,
    ) => {
      store.setState((prev) => ({
        messages: [
          ...prev.messages,
          {
            timestamp: new Date(),
            ...message,
          },
        ],
      }));
    },
    [store],
  );
}

export function useClearMessages() {
  const store = useLiveCodeStore();

  return useCallback(() => {
    store.setState((prev) => ({
      ...prev,
      messages: [],
    }));
  }, [store]);
}
