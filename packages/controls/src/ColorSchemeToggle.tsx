import { type ColorScheme, useColorScheme } from "@liqvid/color-scheme/react";
import { useKeyboardShortcut } from "@liqvid/keymap/react";
import { onClickReact } from "@liqvid/utils";
import clsx from "clsx";
import { useMemo } from "react";

import { convertShortcuts } from "./utils.ts";

type ColorSchemeToggleProps = {
  className?: string;
  render: (
    state: {
      colorScheme: ColorScheme;
    },
    props: React.ButtonHTMLAttributes<HTMLButtonElement>,
  ) => React.ReactNode;
  shortcuts?: string | string[];
};

export function ColorSchemeToggle({
  render,
  shortcuts,
  ...props
}: ColorSchemeToggleProps) {
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
      ...events,
      ...props,
    },
  );
}
