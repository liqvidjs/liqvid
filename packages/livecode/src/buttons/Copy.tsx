import { onClickReact } from "@liqvid/utils";
import classNames from "classnames";
import { useCallback, useMemo } from "react";

import { useLiveCodeStore } from "../store";

/** Button for copying the contents of one group to another. */

export function Copy({
  children = "Copy",
  className,
  from: fromGroup,
  to: toGroup,
  ...attrs
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Source editor group. */
  from: string;

  /** Target editor group. */
  to: string;
}) {
  const store = useLiveCodeStore();

  const copy = useCallback(() => {
    const { groups } = store.getState();

    const from = groups[fromGroup];
    const to = groups[toGroup];

    if (!(from && to)) {
      console.error(`Could not copy from ${fromGroup} to ${toGroup}`);
      return;
    }

    for (const file of from.files) {
      const source = file.view;
      const target = to.files.find((_) => _.filename === file.filename).view;
      target.dispatch(
        target.state.update({
          changes: {
            from: 0,
            insert: source.state.doc,
            to: target.state.doc.length,
          },
        }),
      );
    }
  }, [fromGroup, store.getState, toGroup]);

  const events = useMemo(() => onClickReact(copy), [copy]);

  return (
    <button
      className={classNames("lqv-cb-copy", className)}
      {...events}
      {...attrs}
    >
      {children}
    </button>
  );
}
