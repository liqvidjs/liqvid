import { onClickReact } from "@liqvid/utils";
import classNames from "classnames";
import { useCallback, useMemo } from "react";

import { useLiveCodeShortcut } from "../hooks";
import { useLiveCodeStore } from "../store";

/** Button for clearing the output/console. */
export function Clear({
  className,
  shortcut,
  ...attrs
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Keyboard shortcut to clear the console. */
  shortcut?: string;
}) {
  const store = useLiveCodeStore();

  const clear = useCallback(() => {
    store.setState({ messages: [] });
  }, [store.setState]);

  const events = useMemo(() => onClickReact(clear), [clear]);

  // keyboard shortcut
  useLiveCodeShortcut(
    shortcut,
    useCallback(() => {
      clear();
      return true;
    }, [clear]),
  );

  return (
    <button
      className={classNames("lqv-cb-clear", className)}
      type="button"
      {...events}
      {...attrs}
    />
  );
}
