import { useFormatActiveFile, useLiveCodeShortcut } from "@lqv/livecode";
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

  // keyboard shortcut
  useLiveCodeShortcut(
    shortcut,
    useCallback(() => {
      formatCurrentFile();
      return true;
    }, [formatCurrentFile]),
  );

  return (
    <button
      className={classNames("lqv-livecode-format", className)}
      onClick={formatCurrentFile}
      type="button"
      {...props}
    />
  );
}
