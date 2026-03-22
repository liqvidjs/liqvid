import type { Extension } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { useKeymap } from "@liqvid/keymap/react";
import { selectCmd } from "@lqv/codemirror";
import { passThrough } from "@lqv/codemirror/extensions";
import { useEffect, useMemo } from "react";

import { recording } from "../extensions";
import { type State, useBoothStore } from "../store";

import { Editor } from "./Editor";

/** Recording editor. */
export const Record: React.FC<
  React.ComponentProps<typeof Editor> & {
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
  }
> = (props) => {
  const {
    captureKeys = {
      "Mod-Enter": "run",
      "Mod-K": "clear",
      "Mod-L": "clear",
    },
    extensions = [],
    group = "default",
    passKeys = ["Mod-Alt-2", "Mod-Alt-3", "Mod-Alt-4"],
    ...attrs
  } = props;

  const store = useBoothStore();
  const lqvKeymap = useKeymap();

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
    const state = store.getState();
    const { view } = state.groups[group].files.find(
      (file) => file.filename === props.filename,
    );

    view.dispatch({
      effects: recording.reconfigure([
        ...(recording.get(view.state) as Extension[]),
        [state.recorder.extension(captureKeys)],
      ]),
    });

    includeFilenameInRecording(state);
  }, [captureKeys, group, props.filename, store.getState]);

  return (
    <Editor content={props.content} extensions={newExtensions} {...attrs} />
  );
};

/* NOOOOOOOOOO */
const modifiedRecorder = Symbol();

type Hack = State["recorder"] & { [modifiedRecorder]: boolean };

function includeFilenameInRecording(state: State) {
  // only do this if we are recording in multiple files
  let recordingExtensions = 0;

  outer: for (const group of Object.values(state.groups)) {
    for (const { view } of group.files) {
      const extnState = recording.get(view.state);
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
    state.recorder.capture(0, selectCmd + state.getActiveFile().filename);
  };
  (state.recorder as Hack)[modifiedRecorder] = true;
}
