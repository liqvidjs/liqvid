import clsx from "clsx";
import { useCallback } from "react";

import {
  useActiveFile,
  useFormatActiveFile,
  useLiveCodeShortcut,
} from "../hooks.ts";

/**
 * Button to format the currently active file.
 */
export function Format({
  className,
  shortcut,
  ...props
}: {
  className?: string;
  shortcut?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const formatCurrentFile = useFormatActiveFile();

  const activeFile = useActiveFile();

  // keyboard shortcut
  useLiveCodeShortcut(
    shortcut,
    useCallback(() => {
      try {
        formatCurrentFile();
      } catch (e) {
        console.error(e);
      }
      return true;
    }, [formatCurrentFile]),
  );

  return (
    <button
      className={clsx("lqv-livecode-format", className)}
      disabled={!(activeFile?.editable ?? true)}
      onClick={formatCurrentFile}
      type="button"
      {...props}
    />
  );
}
