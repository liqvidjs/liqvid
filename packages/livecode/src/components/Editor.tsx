import { Compartment, EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { useInitial } from "@liqvid/utils";
import { useEffect, useRef, useState } from "react";

import {
  recordingCompartment,
  shortcutsCompartment,
  vimCompartment,
} from "../extensions.ts";
import { useLiveCodeStore } from "../store.ts";

import { useFilenameOptional, useGroup } from "./context.tsx";

/** Compartment for toggling extensions in CodeMirror. */
const editorCompartment = new Compartment();

/** CodeMirror editor. */
export function Editor({
  content = "",
  readOnly = false,
  extensions,
  filename,
  group: groupId,
  ...props
}: {
  /** Initial content for editor. */
  content?: string;

  /**
   * Whether the editor is editable or not.
   */
  readOnly?: boolean;

  /** CodeMirror {@link Extension}s to use in the editor. */
  extensions?: Extension[];

  /** Filename for the file being edited. */
  filename?: string;

  /**
   * Group name for editor. You usually specify this on the parent {@link EditorGroup} instead.
   */
  group?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const contextGroup = useGroup();
  groupId ??= contextGroup;

  const contextFilename = useFilenameOptional();
  filename ??= contextFilename ?? undefined;

  if (!filename) {
    throw new Error(
      "filename must be provided to Editor, either directly or through `<EditorPanel>`.",
    );
  }

  const store = useLiveCodeStore();

  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<EditorView>();

  // changing content, filename, or groupId is not supported
  // changing extensions or readOnly is done separately
  const initialSettings = useInitial({
    content,
    extensions,
    filename,
    groupId,
    readOnly,
  });

  // initialize the view
  useEffect(() => {
    if (!ref.current) return;

    const { content, extensions, filename, groupId, readOnly } =
      initialSettings;

    // create editor
    const view = new EditorView({
      parent: ref.current,
      state: EditorState.create({
        doc: content,
        extensions: [
          recordingCompartment.of([]),
          shortcutsCompartment.of([]),

          // vim
          vimCompartment.of([]),
          ...(readOnly ? [EditorView.editable.of(false)] : []),
          ...(extensions ?? []),
        ],
      }),
    });

    setView(view);

    // insert into state
    store.setState((prev) => {
      const group = prev.groups[groupId] ?? {
        activeFile: filename!, // set by <EditorPanel>
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
                editable: !readOnly,
                filename: filename!, // set by <EditorPanel>
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
  }, [store.setState]);

  // configure extensions
  useEffect(() => {
    view?.dispatch({
      effects: editorCompartment.reconfigure([
        ...(readOnly ? [EditorView.editable.of(false)] : []),
        ...(extensions ?? []),
      ]),
    });
  }, [extensions, readOnly, view]);

  return <div ref={ref} {...props} />;
}
