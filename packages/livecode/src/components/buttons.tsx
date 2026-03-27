import { onClick } from "@liqvid/utils/react";
import classNames from "classnames";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useStore } from "zustand";

import { ids } from "../ids";
import { useBoothStore } from "../store";

/** Button for clearing the output/console. */
export function Clear({
  className,
  children = "Clear",
  shortcut = "Mod-L",
  title = "Clear",
  ...attrs
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Keyboard shortcut to clear the console. */
  shortcut?: string;
}) {
  const store = useBoothStore();

  const clear = useCallback(() => {
    store.setState({ messages: [] });
  }, [store.setState]);

  const events = useMemo(() => onClick(clear), [clear]);

  /* add keyboard shortcuts */
  useEffect(() => {
    store.setState((prev) => ({
      shortcuts: {
        ...prev.shortcuts,
        [shortcut]: {
          key: shortcut,
          run: () => {
            clear();
            return true;
          },
        },
      },
    }));

    return () => {
      store.setState((prev) => ({
        shortcuts: {
          ...prev.shortcuts,
          [shortcut]: undefined,
        },
      }));
    };
  }, [clear, shortcut, store.setState]);

  return (
    <button
      className={classNames("lqv-cb-clear", className)}
      title={title}
      type="button"
      {...events}
      {...attrs}
    >
      {children}
    </button>
  );
}

/** Button for copying the contents of one group to another. */
export function Copy({
  children = "Copy",
  className,
  from: fromGroup,
  to: toGroup,
  ...attrs
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Source editor group. */
  from: string;

  /** Target editor group. */
  to: string;
}) {
  const store = useBoothStore();

  const copy = useCallback(() => {
    const { groups } = store.getState();

    const from = groups[fromGroup];
    const to = groups[toGroup];

    if (!(from && to)) {
      console.error(`Could not copy from ${fromGroup} to ${toGroup}`);
      return;
    }

    for (const file of from.files) {
      const source = file.view;
      const target = to.files.find((_) => _.filename === file.filename).view;
      target.dispatch(
        target.state.update({
          changes: {
            from: 0,
            insert: source.state.doc,
            to: target.state.doc.length,
          },
        }),
      );
    }
  }, [fromGroup, store.getState, toGroup]);

  const events = useMemo(() => onClick(copy), [copy]);

  return (
    <button
      className={classNames("lqv-cb-copy", className)}
      {...events}
      {...attrs}
    >
      {children}
    </button>
  );
}

/** Button for resetting editor contents to initial state. */
export function Reset({
  className,
  children = "Reset",
  title = "Reset",
  ...attrs
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const store = useBoothStore();
  const contents = useRef<Record<string, Record<string, string>>>({});

  /* get contents */
  useEffect(() => {
    const state = store.getState();
    for (const key in state.groups) {
      contents.current[key] = {};
      for (const file of state.groups[key].files) {
        contents.current[key][file.filename] = file.view.state.doc.toString();
      }
    }
  }, [store]);

  /* reset */
  const reset = useCallback(() => {
    const state = store.getState();
    for (const groupName in contents.current) {
      for (const file of state.groups[groupName].files) {
        if (file.filename in contents.current[groupName]) {
          file.view.dispatch(
            file.view.state.update({
              changes: {
                from: 0,
                insert: contents.current[groupName][file.filename],
                to: file.view.state.doc.length,
              },
            }),
          );
        }
      }
    }
  }, [store]);

  const resetEvents = useMemo(() => onClick(reset), [reset]);

  return (
    <button
      className={classNames("lqv-cb-reset", className)}
      title={title}
      {...resetEvents}
      {...attrs}
    >
      {children}
    </button>
  );
}

/** Button for running the code. */
export function Run({
  className,
  children = "Run",
  shortcut = "Mod-Enter",
  title = "Run",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Keyboard shortcut to run the code. */
  shortcut?: string;
}) {
  const store = useBoothStore();

  // run callback
  const run = useCallback(() => {
    store.setState((prev) => ({ run: prev.run + 1 }));
  }, [store.setState]);

  /* add keyboard shortcuts */
  useEffect(() => {
    store.setState((prev) => ({
      shortcuts: {
        ...prev.shortcuts,
        [shortcut]: {
          key: shortcut,
          run: () => {
            run();
            return true;
          },
        },
      },
    }));
  }, [run, shortcut, store.setState]);

  // click events
  const events = useMemo(() => onClick(run), [run]);

  return (
    <button
      className={classNames("lqv-cb-run", className)}
      title={title}
      type="button"
      {...events}
      {...props}
    >
      {children}
    </button>
  );
}

/** Group selection tab. */
export function Tab({
  id,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** ID of {@link EditorGroup} this corresponds to */
  id: string;
}) {
  const store = useBoothStore();
  const active = useStore(store, (state) => state.activeGroup === id);

  const events = useMemo(
    () =>
      onClick(() => {
        store.setState({ activeGroup: id });
      }),
    [id, store.setState],
  );

  return (
    <button
      aria-controls={ids.editorGroup({ group: id })}
      aria-selected={active}
      id={ids.groupTab({ group: id })}
      role="tab"
      type="button"
      {...events}
      {...props}
    />
  );
}

/** Holds a list of {@link Tab}s. */
export function TabList(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="tablist" {...props} />;
}
