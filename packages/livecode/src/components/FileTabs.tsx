import { filterRecord, onClickReact } from "@liqvid/utils";
import { selectCmd } from "@lqv/codemirror";
import classNames from "classnames";
import { useCallback, useEffect, useMemo } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";

import { ids } from "../ids";
import { type LiveCodeState, useLiveCodeStore } from "../store";
import { getFileType } from "../utils";

const selector = (state: LiveCodeState) => [
  state.activeGroup,
  state.groups[state.activeGroup]?.activeFile,
];

/**
 * File selector component.
 */
export function FileTabs({
  classNames: propClassNames,
}: {
  classNames?: {
    container?: string;
    tab?: string;
  };
}) {
  const store = useLiveCodeStore();
  const [activeGroup, activeFilename] = useStore(store, useShallow(selector));
  const group = store.getState().groups[activeGroup];

  const select = useCallback(
    (filename: string) => {
      const { activeGroup, recorder } = store.getState();

      // record event
      // @ts-expect-error TODO fix this
      if (recorder?.active) {
        recorder.capture(undefined, selectCmd + filename);
      }

      if (!activeGroup) return;

      // set state
      store.setState((state) => ({
        groups: {
          ...state.groups,
          [activeGroup]: {
            ...state.groups[activeGroup],
            activeFile: filename,
          },
        },
      }));

      // focus editor
      const state = store.getState();
      const view = state.groups[activeGroup]?.files.find(
        (_) => _.filename === filename,
      )?.view;
      if (view) {
        // XXX yikes
        setTimeout(() => view.focus());
      }
    },
    [store.getState, store.setState],
  );

  const events = useMemo(
    () =>
      onClickReact<HTMLButtonElement>((e) => {
        select(e.currentTarget.textContent.trim());
      }),
    [select],
  );

  // set class
  useEffect(() => {
    // keyboard shortcuts
    const selectShortcuts: LiveCodeState["shortcuts"] = {};

    for (let i = 1; i <= 9; ++i) {
      selectShortcuts[`Mod-${i}`] = {
        key: `Mod-${i}`,
        run: () => {
          const state = store.getState();
          if (!state.activeGroup) return false;
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
        shortcuts: filterRecord(
          prev.shortcuts,
          (_, key) => !("Mod-1" <= key && key <= "Mod-9"),
        ),
      }));
    };
  }, [select, store.getState, store.setState]);

  if (!group) return null;

  return (
    <div
      className={classNames("lqv-file-tabs", propClassNames?.container)}
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
