import { Compartment, EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { useEffect, useRef, useState } from "react";

import { recording, shortcuts, vimCompartment } from "../extensions";
import { useLiveCodeStore } from "../store";

/** Compartment for toggling extensions in CodeMirror. */
const editorCompartment = new Compartment();

/** CodeMirror editor. */
export function Editor({
  content = "",
  editable = true,
  extensions,
  filename,
  group: groupId = "default",
  ...props
}: {
  /** Initial content for editor. */
  content?: string;

  /**
   * Whether the editor is editable or not.
   * @default true
   */
  editable?: boolean;

  /** CodeMirror {@link Extension}s to use in the editor. */
  extensions?: Extension[];

  /** Filename for the file being edited. */
  filename?: string;

  /**
   * Group name for editor. You usually specify this on the parent {@link EditorGroup} instead.
   * @default "default"
   */
  group?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const store = useLiveCodeStore();

  const ref = useRef<HTMLDivElement>();
  const [view, setView] = useState<EditorView>();

  // initialize the view
  // biome-ignore lint/correctness/useExhaustiveDependencies: changing `content` is an error
  useEffect(() => {
    if (!ref.current) return;

    // create editor
    const view = new EditorView({
      parent: ref.current,
      state: EditorState.create({
        doc: content,
        extensions: [
          recording.of([]),
          shortcuts.of([]),

          // vim
          vimCompartment.of([]),
          ...(editable ? [] : [EditorView.editable.of(false)]),
          ...(extensions ?? []),
        ],
      }),
    });

    setView(view);

    // insert into state
    store.setState((prev) => {
      const group = prev.groups[groupId] ?? {
        activeFile: filename,
        files: [],
      };

      return {
        activeGroup: prev.activeGroup || groupId,
        groups: {
          ...prev.groups,
          [groupId]: {
            activeFile: group.activeFile,
            files: [
              ...group.files,
              {
                editable,
                filename,
                view,
              },
            ],
          },
        },
      };
    });

    return () => {
      view.destroy();
      store.setState((prev) => {
        return {
          ...prev,
          groups: {
            ...prev.groups,
            ...(prev.groups[groupId]
              ? {
                  [groupId]: {
                    ...prev.groups[groupId],
                    files: prev.groups[groupId].files.filter(
                      (file) => file.filename !== filename,
                    ),
                  },
                }
              : {}),
          },
        };
      });
    };
  }, []);

  // configure extensions
  useEffect(() => {
    view?.dispatch({
      effects: editorCompartment.reconfigure([
        ...(editable ? [] : [EditorView.editable.of(false)]),
        ...(extensions ?? []),
      ]),
    });
  }, [editable, extensions, view]);

  return <div ref={ref} {...props} />;
}
