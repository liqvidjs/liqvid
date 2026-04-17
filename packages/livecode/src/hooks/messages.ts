import { useCallback } from "react";

import { type ConsoleMessage, useLiveCodeStore } from "../store";

export function useAddMessage() {
  const store = useLiveCodeStore();

  return useCallback(
    <M extends Omit<ConsoleMessage<unknown, string>, "timestamp">>(
      message: M,
    ) => {
      store.setState((prev) => ({
        messages: [
          ...prev.messages,
          {
            ...message,
            timestamp: new Date(),
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
