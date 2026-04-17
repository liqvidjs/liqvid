import { Fragment } from "react";
import { useStore } from "zustand";

import { useLiveCodeStore } from "../../store";

import { isHTMLConsoleMessage } from "./html-utils";

type RenderProp<T> = (
  msg: {
    data: T;
    timestamp: Date;
  },
  props?: React.ComponentProps<"pre">,
) => React.ReactNode;

export function HTMLConsole(props: {
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
    <div className="space-between flex gap-2 border-0 border-gray-300 border-b border-solid px-1">
      <ol>
        {messages.map((msg, i) => {
          if (!isHTMLConsoleMessage(msg)) return null;

          const { data, timestamp } = msg;

          return (
            <li key={timestamp.toISOString() + `#${i}`}>
              {data.map((value, j) => {
                // biome-ignore lint/suspicious/noExplicitAny: too complex
                let renderFn: string | RenderProp<any> | undefined;

                const key = timestamp.toISOString() + `#${i}#${j}`;

                if (value === null) {
                  renderFn = props.null;
                } else {
                  renderFn = props[typeof value];
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
                    {(renderFn ?? renderDefault)(
                      { data: value, timestamp },
                      {},
                    )}
                  </Fragment>
                );
              })}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
