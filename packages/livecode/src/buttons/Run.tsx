import { onClickReact } from "@liqvid/utils";
import classNames from "classnames";
import { useCallback, useMemo } from "react";

import { useLiveCodeShortcut } from "../hooks";
import { useLiveCodeStore } from "../store";

/** Button for running the code. */
export function Run({
  className,
  shortcut,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Keyboard shortcut to run the code. */
  shortcut?: string;
}) {
  const { setState: setStoreState } = useLiveCodeStore();

  // run callback
  const run = useCallback(() => {
    setStoreState((prev) => ({ run: prev.run + 1 }));
  }, [setStoreState]);

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
      className={classNames("lqv-livecode-run", className)}
      type="button"
      {...events}
      {...props}
    />
  );
}
