import { Menu } from "@base-ui/react/menu";
import {
  useDownloadAll,
  useDownloadCurrent,
  useLiveCodeStore,
} from "@lqv/livecode";
import { DownloadIcon } from "@phosphor-icons/react";
import { useColorScheme } from "liqvid";
import { twMerge } from "tailwind-merge";
import { useStore } from "zustand/react";
import { useShallow } from "zustand/shallow";

import { ButtonLabel } from "../theme.tsx";

import { buttonStyles } from "./styles.tsx";

export function DownloadButton({
  disabled = false,
  ...props
}: React.ComponentProps<"button">) {
  const store = useLiveCodeStore();

  const { activeGroup, groups } = useStore(
    store,
    useShallow((state) => ({
      activeGroup: state.activeGroup,
      groups: state.groups,
    })),
  );

  const downloadCurrent = useDownloadCurrent();
  const downloadZip = useDownloadAll();

  const numFiles = groups[activeGroup ?? "default"]?.files.length ?? 0;

  const { colorScheme } = useColorScheme();

  const isDisabled = disabled || numFiles === 0;

  if (numFiles <= 1) {
    return (
      <button
        // autoComplete necessary to avoid hydration mismatch with `disabled` in Firefox
        autoComplete="off"
        className={buttonStyles}
        disabled={isDisabled}
        onClick={downloadCurrent}
        title="Download"
        type="button"
        {...props}
      >
        <DownloadIcon />
        <ButtonLabel>Download</ButtonLabel>
      </button>
    );
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        // autoComplete necessary to avoid hydration mismatch with `disabled` in Firefox
        autoComplete="off"
        className={buttonStyles}
        disabled={isDisabled}
        title="Download"
        {...props}
      >
        <DownloadIcon />
        <ButtonLabel>Download</ButtonLabel>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={2}>
          <Menu.Popup
            className="z-50 overflow-hidden rounded-sm bg-stone-200 text-xs dark:bg-stone-700"
            data-color-scheme={colorScheme}
          >
            <MenuItem onClick={downloadCurrent}>Current file</MenuItem>
            <MenuItem onClick={downloadZip}>All as .zip</MenuItem>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

const MenuItem = ({
  className,
  ...props
}: React.ComponentProps<typeof Menu.Item> & { className?: string }) => (
  <Menu.Item
    className={twMerge(
      "cursor-pointer px-2 py-1 text-black hover:bg-stone-300 active:bg-stone-400 dark:text-white dark:active:bg-stone-800 dark:hover:bg-stone-600",
      className,
    )}
    {...props}
  />
);
