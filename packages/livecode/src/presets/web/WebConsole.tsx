import { Fragment } from "react";
import { useStore } from "zustand";

import { useLiveCodeStore } from "../../store.ts";

import { isWebConsoleMessage, type WebConsoleMessage } from "./html-utils.ts";

type RenderProp<T> = (
  msg: {
    data: T;
    timestamp: Date;
  },
  props?: React.ComponentProps<"pre">,
) => React.ReactNode;

type RenderItem = (
  msg: WebConsoleMessage,
  props: React.ComponentProps<"li">,
) => React.ReactNode;

/**
 * Rich JavaScript/TypeScript console resembling what is found in web browsers.
 */
export function WebConsole({
  className,
  ...props
}: {
  className?: string;

  debug?: RenderItem;
  error?: RenderItem;
  info?: RenderItem;
  log?: RenderItem;
  warn?: RenderItem;

  bigint?: RenderProp<bigint> | string;
  boolean?: RenderProp<boolean> | string;
  function?: RenderProp<(...args: unknown[]) => unknown> | string;
  null?: RenderProp<null> | string;
  number?: RenderProp<number> | string;
  object?: RenderProp<object> | string;
  string?: RenderProp<string> | string;
  symbol?: RenderProp<symbol> | string;
  undefined?: RenderProp<undefined> | string;
}) {
  const store = useLiveCodeStore();
  const messages = useStore(store, ({ messages }) => messages);

  const renderDefault: RenderProp<unknown> = ({ data }, props) => (
    <pre {...props}>{String(data)}</pre>
  );

  return (
    <ol className={className}>
      {messages.map((msg, i) => {
        if (!isWebConsoleMessage(msg)) return null;

        const { data, kind, timestamp } = msg;

        /* ------------------------------ render the individual parts of the value ------------------------------ */
        const contents = data.map((value, j) => {
          // biome-ignore lint/suspicious/noExplicitAny: too complex
          let renderFn: string | RenderProp<any> | undefined;

          const key = timestamp.toISOString() + `#${i}#${j}`;

          if (value === null) {
            renderFn = props.null ?? renderDefault;
          } else {
            renderFn = props[typeof value] ?? renderDefault;
          }

          if (typeof renderFn === "string") {
            return (
              <Fragment key={key}>
                {renderDefault(
                  { data: value, timestamp },
                  { className: renderFn },
                )}
              </Fragment>
            );
          }

          return (
            <Fragment key={key}>
              {renderFn({ data: value, timestamp }, {})}
            </Fragment>
          );
        });

        const defaultRenderItem: RenderItem = (_, props) => <li {...props} />;

        const renderItemFn = props[kind] ?? defaultRenderItem;

        if (typeof renderItemFn === "string") {
          return (
            <li className={renderItemFn} key={i}>
              {contents}
            </li>
          );
        }

        return (
          <Fragment key={i}>
            {renderItemFn(msg, { children: contents })}
          </Fragment>
        );
      })}
    </ol>
  );
}
