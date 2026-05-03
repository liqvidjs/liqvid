import { onClickReact } from "@liqvid/utils";
import clsx from "clsx";
import { useCallback, useMemo } from "react";

import { useLiveCodeShortcut, useRun } from "../hooks.ts";

/** Button for running the code. */
export function Run({
  className,
  shortcut,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Keyboard shortcut to run the code. */
  shortcut?: string;
}) {
  // run callback
  const run = useRun();

  // keyboard shortcut
  useLiveCodeShortcut(
    shortcut,
    useCallback(() => {
      run();
      return true;
    }, [run]),
  );

  // click events
  const events = useMemo(() => onClickReact(run), [run]);

  return (
    <button
      className={clsx("lqv-livecode-run", className)}
      type="button"
      {...events}
      {...props}
    />
  );
}
