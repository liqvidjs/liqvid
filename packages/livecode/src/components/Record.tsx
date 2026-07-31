import { keymap } from "@codemirror/view";
import { useKeymap } from "@liqvid/keymap/react";
import { selectCmd } from "@lqv/codemirror";
import { passThrough } from "@lqv/codemirror/extensions";
import { useEffect, useMemo } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";

import { recordingCompartment } from "../extensions.ts";
import { selectActiveFile } from "../selectors.ts";
import { type LiveCodeState, useLiveCodeStore } from "../store.ts";

import { useFilenameOptional, useGroup } from "./context.tsx";
import { Editor } from "./Editor.tsx";

/** Recording editor. */
export function Record({
  extensions = [],
  filename,
  group: groupId = "default",
  passKeys = [],
  ...props
}: React.ComponentProps<typeof Editor> & {
  /**
   * Special key sequences to include in recording.
   * @default {"Mod-Enter":"run","Mod-K":"clear","Mod-L":"clear"}
   */
  captureKeys?: Record<string, string>;

  /**
   * Key sequences to pass through to {@link Keymap}.
   * @default ["Mod-Alt-2","Mod-Alt-3","Mod-Alt-4"]
   */
  passKeys?: string[];
}) {
  const contextGroup = useGroup();
  groupId ??= contextGroup;

  const contextFilename = useFilenameOptional();
  filename ??= contextFilename;

  const {
    captureKeys = {
      "Mod-Enter": "run",
      "Mod-K": "clear",
      "Mod-L": "clear",
    },
    // passKeys = ["Mod-Alt-2", "Mod-Alt-3", "Mod-Alt-4"],
    ...attrs
  } = props;

  const store = useLiveCodeStore();
  const lqvKeymap = useKeymap();

  const { groups, recorder } = useStore(
    store,
    useShallow(({ groups, recorder }) => ({ groups, recorder })),
  );

  const newExtensions = useMemo(
    () =>
      lqvKeymap
        ? [keymap.of(passThrough(lqvKeymap, passKeys)), ...extensions]
        : extensions,
    [extensions, lqvKeymap, passKeys],
  );

  // attach recording extensions --- this has to be done this way because
  // the `shortcuts` Compartment will abort further handling of the sequence
  useEffect(() => {
    if (!recorder) return;

    const file = groups[groupId]?.files.find(
      (file) => file.filename === filename,
    );
    if (!file) return;

    const { view } = file;

    view.dispatch({
      effects: recordingCompartment.reconfigure([
        recorder.extension(captureKeys),
      ]),
    });

    includeFilenameInRecording(store.getState());

    return () => {
      view.dispatch({
        effects: recordingCompartment.reconfigure([]),
      });
    };
  }, [captureKeys, groups, filename, recorder, store, groupId]);

  return (
    <Editor
      extensions={newExtensions}
      filename={filename}
      group={groupId}
      {...attrs}
    />
  );
}

/* NOOOOOOOOOO */
const modifiedRecorder = Symbol();

type Hack = LiveCodeState["recorder"] & { [modifiedRecorder]: boolean };

function includeFilenameInRecording(state: LiveCodeState) {
  if (!state.recorder) return;

  // only do this if we are recording in multiple files
  let recordingExtensions = 0;

  outer: for (const group of Object.values(state.groups)) {
    for (const { view } of group.files) {
      const extnState = recordingCompartment.get(view.state);
      if (Array.isArray(extnState) && extnState.length > 0) {
        recordingExtensions++;
        if (recordingExtensions > 1) break outer;
      }
    }
  }

  if (recordingExtensions < 2) {
    return;
  }

  // be idempotent
  if ((state.recorder as Hack)[modifiedRecorder]) {
    return;
  }

  // intercept beginRecording
  const beginRecording = state.recorder.beginRecording.bind(state.recorder);
  state.recorder.beginRecording = (...args) => {
    // have to call existing beginRecording() FIRST in order to
    // set state.recorder.duration, otherwise we get negative times!
    beginRecording(...args);

    const activeFile = selectActiveFile(state);
    if (!activeFile) return;
    state.recorder?.capture(0, selectCmd + activeFile.filename);
  };
  (state.recorder as Hack)[modifiedRecorder] = true;
}
