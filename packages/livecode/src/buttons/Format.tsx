import {
  useActiveFile,
  useFormatActiveFile,
  useLiveCodeShortcut,
} from "@lqv/livecode";
import classNames from "classnames";
import { useCallback } from "react";

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
      className={classNames("lqv-livecode-format", className)}
      disabled={!(activeFile?.editable ?? true)}
      onClick={formatCurrentFile}
      type="button"
      {...props}
    />
  );
}
