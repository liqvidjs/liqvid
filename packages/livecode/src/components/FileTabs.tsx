import { onClick } from "@liqvid/utils/react";
import { selectCmd } from "@lqv/codemirror";
import classNames from "classnames";
import { useCallback, useEffect, useMemo } from "react";
import { useStore } from "zustand";

import { type State, useBoothStore } from "../store";
import { ids } from "../utils";

const selector = (state: State) => [
  state.activeGroup,
  state.groups[state.activeGroup]?.activeFile,
];

/**
 * File selector component.
 */
export function FileTabs({
  className,
  classNames: propClassNames,
}: {
  /** @deprecated Use `classNames.container` instead. */
  className?: string;
  classNames?: {
    container?: string;
    tab?: string;
  };
}) {
  const store = useBoothStore();
  const [activeGroup, activeFilename] = useStore(store, selector);
  const group = store.getState().groups[activeGroup];
  const { recorder } = store.getState();

  const select = useCallback(
    (filename: string) => {
      // record event
      // @ts-expect-error TODO fix this
      if (recorder?.manager?.active) {
        recorder.capture(undefined, selectCmd + filename);
      }

      // set state
      store.setState((state) => ({
        groups: {
          ...state.groups,
          [state.activeGroup]: {
            ...state.groups[state.activeGroup],
            activeFile: filename,
          },
        },
      }));

      // focus editor
      const state = store.getState();
      const view = state.groups[state.activeGroup]?.files.find(
        (_) => _.filename === filename,
      )?.view;
      if (view) {
        // XXX yikes
        setTimeout(() => view.focus());
      }
    },
    [recorder, store.getState, store.setState],
  );

  const events = useMemo(
    () =>
      onClick<HTMLButtonElement>((e) => {
        select(e.currentTarget.textContent.trim());
      }),
    [select],
  );

  // set class
  useEffect(() => {
    // keyboard shortcuts
    const selectShortcuts: State["shortcuts"] = {};

    for (let i = 1; i <= 9; ++i) {
      selectShortcuts[`Mod-${i}`] = {
        key: `Mod-${i}`,
        run: () => {
          const state = store.getState();
          const group = state.groups[state.activeGroup];

          if (group.files.length < i) return false;

          select(group.files[i - 1].filename);

          return true;
        },
      };
    }

    // set class
    store.setState((prev) => ({
      // set class
      classNames: prev.classNames.concat("multifile"),
      // shortcuts
      shortcuts: {
        ...prev.shortcuts,
        ...selectShortcuts,
      },
    }));

    return () => {
      store.setState((prev) => ({
        // set class
        classNames: prev.classNames.filter((_) => _ !== "multifile"),
        // shortcuts
        shortcuts: Object.fromEntries(
          Object.entries(prev.shortcuts).filter(
            ([key]) => !("Mod-1" <= key && key <= "Mod-9"),
          ),
        ),
      }));
    };
  }, [select, store.getState, store.setState]);

  if (!group) return null;

  return (
    <div
      className={classNames(
        "lqv-file-tabs",
        propClassNames?.container ?? className,
      )}
      role="tablist"
    >
      {group.files.map(({ filename }) => (
        <button
          aria-controls={ids.editorPanel({ filename, group: activeGroup })}
          aria-selected={activeFilename === filename}
          className={classNames(
            `lqv-filetype-${getFileType(filename)}`,
            propClassNames?.tab,
          )}
          id={ids.fileTab({ filename, group: activeGroup })}
          key={filename}
          role="tab"
          {...events}
        >
          {filename}
        </button>
      ))}
    </div>
  );
}

/**
 * Get file extension.
 * @param filename Name of file.
 * @returns File extension.
 */
function getFileType(filename: string): string {
  return filename.slice(filename.lastIndexOf(".") + 1);
}
