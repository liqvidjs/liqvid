import classNames from "classnames";
import { useCallback } from "react";

import { useClearMessages, useLiveCodeShortcut } from "../hooks";

/** Button for clearing the output/console. */
export function Clear({
  className,
  shortcut,
  ...attrs
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Keyboard shortcut to clear the console. */
  shortcut?: string;
}) {
  const clear = useClearMessages();

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
      onClick={clear}
      type="button"
      {...attrs}
    />
  );
}
