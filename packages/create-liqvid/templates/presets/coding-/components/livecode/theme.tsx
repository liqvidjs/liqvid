/* biome-ignore-all lint/style/noRestrictedImports: this is where they're defined */
import { vsCodeDark, vsCodeLight } from "@fsegurai/codemirror-theme-bundle";
import { useToggle } from "@liqvid/utils";
import {
  basicSetup,
  Clear as UnstyledClearButton,
  Editor as UnstyledEditor,
  EditorGroup as UnstyledEditorGroup,
  EditorPanel as UnstyledEditorPanel,
  FileTabs as UnstyledFileTabs,
  Format as UnstyledFormatButton,
  LiveCode as UnstyledLiveCode,
  Mirror as UnstyledMirrorButton,
  Record as UnstyledRecord,
  Replay as UnstyledReplay,
  Resize as UnstyledResize,
  Run as UnstyledRunButton,
  Tab as UnstyledTab,
  TabList as UnstyledTabList,
  VimToggle as UnstyledVimToggleButton,
  useLightDarkExtensions,
} from "@lqv/livecode";
import { HTMLPreview as UnstyledHTMLPreview } from "@lqv/livecode/web";
import {
  ArrowsClockwiseIcon,
  BracketsCurlyIcon,
  PlayIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import type { SetOptional } from "type-fest";

import { brand } from "#lib/utils.ts";

import { buttonStyles } from "./buttons/styles.tsx";
import VimSvg from "./vim.svg";

import styles from "./livecode.module.css";

/* ------------------------------ layout and utilities ------------------------------ */
export const Actions = brand("Actions", "div", {
  className: clsx("mr-1 ml-auto flex items-center justify-around gap-1"),
});

export const Controls = brand("Controls", "div", {
  className: clsx(
    "lv-static:hidden! mt-auto flex h-8 items-center border-(--sep) border-0 border-t bg-(--surface)",
  ),
});

export const ButtonLabel = brand("ButtonLabel", "span", {
  className: clsx("@max-md:hidden"),
});

/* ------------------------------ styled components ------------------------------ */
export const LiveCode = brand("LiveCode", UnstyledLiveCode, {
  className: clsx(
    "relative flex h-(--lv-canvas-height) overflow-hidden",
    styles.LiveCode,
  ),
});

export const FileTabs = brand("FileTabs", UnstyledFileTabs, {
  classNames: {
    container:
      "bg-(--surface) border-b border-(--sep) whitespace-nowrap scrollbar-none overflow-x-auto",
    tab: clsx(
      "relative inline-flex cursor-pointer items-center justify-center",
      "border-0 border-r border-r-[#aaa] border-solid",
      "py-2 pr-4 pl-7",
      styles.FileTab,
    ),
  },
});

export const Editor = ({
  className,
  extensions = [],
  ...props
}: React.ComponentProps<typeof UnstyledEditor>) => {
  const editorTheme = useLightDarkExtensions({
    dark: [vsCodeDark],
    light: [vsCodeLight],
  });

  return (
    <UnstyledEditor
      className={clsx("flex-1 *:h-full", styles.editor, className)}
      extensions={[basicSetup, editorTheme, ...extensions]}
      {...props}
    />
  );
};

export const EditorGroup = brand("EditorGroup", UnstyledEditorGroup, {
  className: "flex-1 overflow-hidden",
});

export const EditorPanel = brand("EditorPanel", UnstyledEditorPanel, {
  className:
    "h-full flex-1 overflow-hidden *:h-full [&_.cm-scroller]:overscroll-none",
});

export const Record = ({
  className,
  extensions = [],
  ...props
}: React.ComponentProps<typeof UnstyledRecord>) => {
  const editorTheme = useLightDarkExtensions({
    dark: [vsCodeDark],
    light: [vsCodeLight],
  });

  return (
    <UnstyledRecord
      className={twMerge("flex-1 *:h-full", styles.editor, className)}
      extensions={[basicSetup, editorTheme, ...extensions]}
      {...props}
    />
  );
};

export const Replay = ({
  className,
  extensions = [],
  ...props
}: React.ComponentProps<typeof UnstyledReplay>) => {
  const editorTheme = useLightDarkExtensions({
    dark: [vsCodeDark],
    light: [vsCodeLight],
  });

  return (
    <UnstyledReplay
      className={twMerge("flex-1 *:h-full", styles.editor, className)}
      extensions={[basicSetup, editorTheme, ...extensions]}
      {...props}
    />
  );
};

export const Tab = brand("Tab", UnstyledTab, {
  className: clsx(
    "flex h-full cursor-pointer items-center gap-1 bg-(--surface-contrast) px-4 text-gray-500",
    "disabled:cursor-default disabled:opacity-20",
    "aria-selected:bg-(--lv-accent) aria-selected:text-white",
  ),
});

export const TabList = brand("TabList", UnstyledTabList, {
  className: clsx("flex h-full"),
});

export const HTMLPreview = brand("HTMLPreview", UnstyledHTMLPreview, {
  className: clsx("border-none outline-none", styles.iframe),
});

export const Resize = brand("Resize", UnstyledResize, {
  className: styles.resize,
  draggingClass: "dragging",
  size: "8px",
});

/* ------------------------------ buttons ------------------------------ */
/** Button for clearing the output/console. */
export function ClearButton() {
  return (
    <UnstyledClearButton
      className={twMerge(
        buttonStyles,
        "hover:bg-red-500! active:bg-red-600!",
        "dark:active:bg-red-700! dark:hover:bg-red-600!",
      )}
      shortcut="Mod+-"
      title="Clear console (⌘-)"
    >
      <TrashIcon weight="fill" />
      <ButtonLabel>Clear</ButtonLabel>
    </UnstyledClearButton>
  );
}

/** Button to format the currently active file. */
export function FormatButton() {
  return (
    <UnstyledFormatButton
      className={twMerge(buttonStyles)}
      shortcut="Mod+;"
      title="Format (⌘;)"
    >
      <BracketsCurlyIcon />
      <ButtonLabel>Format</ButtonLabel>
    </UnstyledFormatButton>
  );
}

export function MirrorButton({
  from = "replay",
  to = "playground",
  ...props
}: SetOptional<
  React.ComponentProps<typeof UnstyledMirrorButton>,
  "from" | "to"
>) {
  return (
    <UnstyledMirrorButton
      className={twMerge(buttonStyles)}
      from={from}
      title="Copy code into the Playground"
      to={to}
      {...props}
    >
      <ArrowsClockwiseIcon />
      <ButtonLabel>Mirror</ButtonLabel>
    </UnstyledMirrorButton>
  );
}

export function RunButton() {
  return (
    <UnstyledRunButton
      className={twMerge(
        buttonStyles,
        "hover:bg-green-500! active:bg-green-600!",
        "dark:active:bg-green-700! dark:hover:bg-green-600!",
      )}
      shortcut="Mod+Enter"
      title="Refresh (⌘↩)"
    >
      <PlayIcon weight="fill" />
      <ButtonLabel>Run</ButtonLabel>
    </UnstyledRunButton>
  );
}

export function VimToggleButton() {
  return (
    <UnstyledVimToggleButton
      className="flex w-8 cursor-pointer items-baseline justify-center text-gray-400 aria-checked:text-green-700"
      persistence={{ name: "liqvid.livecode.vim" }}
      shortcut="Mod-."
      title="Toggle Vim mode"
    >
      <VimSvg className="h-[1em]" />
    </UnstyledVimToggleButton>
  );
}

/** Component for displaying console logs. */
export function ConsoleRoot({
  className,
  children,
  defaultExpanded = false,
}: {
  className?: string;
  children?: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const { toggle, value: isExpanded } = useToggle(defaultExpanded);

  const id = useId();

  return (
    <section
      className={clsx(
        "border-0 border-gray-200 border-l border-solid bg-gray-100",
        "dark:border-gray-800 dark:bg-slate-800",
        className,
      )}
      data-expanded={isExpanded}
      id={id}
    >
      <header className="flex items-center bg-slate-700 px-1! text-white">
        Console
        <button
          aria-controls={id}
          aria-expanded={isExpanded}
          className="ml-auto inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-sm hover:bg-slate-600"
          onClick={toggle}
          title={isExpanded ? "Collapse console" : "Expand console"}
          type="button"
        >
          {isExpanded ? <CaretDownIcon /> : <CaretUpIcon />}
        </button>
      </header>
      {isExpanded && children}
    </section>
  );
}
