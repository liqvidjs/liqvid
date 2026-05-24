"use client";

import { type ColorScheme, useColorScheme } from "@liqvid/color-scheme/react";
import { useEventListener } from "@liqvid/event-emitter/react";
import clsx from "clsx";
import { useCallback, useEffect, useRef } from "react";

import { useAddMessage, useClearMessages, useOnRun } from "../../hooks.ts";
import { useLiveCodeStore } from "../../store.ts";
import { viewContents } from "../../utils.ts";

import { render, type WebConsoleMessage } from "./html-utils.ts";
import type { WebConsoleMessageUp } from "./magicScripts.ts";

/**
 * Render a preview of HTML code in an iframe.
 *
 * CSS-only changes do not cause the preview to reload.
 */
export function HTMLPreview({
  className,
  ...props
}: React.ComponentProps<"iframe">) {
  const store = useLiveCodeStore();

  const { colorScheme } = useColorScheme();

  const iframe = useRef<HTMLIFrameElement>(null);

  /** synchronize iframe color scheme with parent context */
  const syncColorScheme = useCallback((scheme: ColorScheme) => {
    iframe.current?.contentWindow?.postMessage(
      {
        colorScheme: scheme,
        type: "color-scheme",
      },
      "*",
    );
  }, []);

  useEffect(() => {
    syncColorScheme(colorScheme);
  }, [colorScheme, syncColorScheme]);

  useEventListener(iframe.current, "load", () => {
    syncColorScheme(colorScheme);
  });

  const refresh = useCallback(() => {
    const { groups, activeGroup } = store.getState();
    if (!activeGroup) return;
    const files = groups?.[activeGroup]?.files ?? [];

    const args = files.reduce(
      (acc, { filename, view }) => {
        const language = filename.slice(filename.lastIndexOf(".") + 1);

        switch (language) {
          case "css":
            acc.css[filename] = viewContents(view);
            break;
          case "js":
            /*if (meta?.[filename]?.type === "module") {
              acc.esm[filename] = viewContents(view);
            }/ else {*/
            acc.js[filename] = viewContents(view);
            //}
            break;
          case "html":
            acc.html = viewContents(view);
            break;
        }
        return acc;
      },
      { css: {}, esm: {}, html: "", js: {} } as Required<
        Parameters<typeof render>[0]
      >,
    );

    if (iframe.current) {
      iframe.current.srcdoc = render(args);
    }

    return true;
  }, [store]);

  // initial render
  useOnRun(refresh);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const addMessage = useAddMessage();
  const clearMessages = useClearMessages();

  useEventListener(globalThis?.window, "message", (msg: MessageEvent) => {
    if (!msg.data?.type) return;
    if (!isWebConsoleMessageUp(msg.data)) return;

    switch (msg.data.type) {
      case "console.debug":
      case "console.error":
      case "console.info":
      case "console.warn":
      case "console.log":
        addMessage<WebConsoleMessage>({
          characterNumber: msg.data.characterNumber,
          data: msg.data.content,
          filename: msg.data.filename,
          kind: msg.data.type.slice(
            "console.".length,
          ) as WebConsoleMessage["kind"],
          lineNumber: msg.data.lineNumber,
        });
        break;
      case "console.clear":
        clearMessages();
    }
  });

  return (
    <iframe
      allow="fullscreen"
      className={clsx("lqv-livecode-html-preview", className)}
      ref={iframe}
      sandbox="allow-scripts"
      {...props}
    />
  );
}

function isWebConsoleMessageUp(msg: unknown): msg is WebConsoleMessageUp {
  return (
    typeof msg === "object" &&
    msg !== null &&
    typeof (msg as WebConsoleMessageUp).type === "string" &&
    (msg as WebConsoleMessageUp).type.startsWith("console.")
  );
}
