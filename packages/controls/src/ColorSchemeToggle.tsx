import { type ColorScheme, useColorScheme } from "@liqvid/color-scheme/react";
import { useKeyboardShortcut } from "@liqvid/keymap/react";
import { onClickReact } from "@liqvid/utils";
import classNames from "classnames";
import { useMemo } from "react";

import { convertShortcuts } from "./utils";

export function ColorSchemeToggle({
  className,
  render,
  shortcuts,
}: {
  className?: string;
  render: (
    state: {
      colorScheme: ColorScheme;
    },
    props: React.ButtonHTMLAttributes<HTMLButtonElement>,
  ) => React.ReactNode;
  shortcuts?: string | string[];
}) {
  const { colorScheme, toggleColorScheme } = useColorScheme();

  useKeyboardShortcut(shortcuts, toggleColorScheme);

  const events = useMemo(
    () => onClickReact(toggleColorScheme),
    [toggleColorScheme],
  );

  return render(
    { colorScheme },
    {
      "aria-keyshortcuts": convertShortcuts(shortcuts),
      className: classNames(
        "lv-controls-color-scheme lv-controls-button",
        className,
      ),
      ...events,
    },
  );
}
