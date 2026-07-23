import {RecordingControl, RecordingManager} from "@liqvid/recording";
import {Tldraw, track, useEditor, type TLEventInfo} from "@tldraw/tldraw";
import {Playback, Player, useKeymap} from "liqvid";

import {useCallback, useEffect} from "react";
import {TldrawRecording} from "./plugin/recording";
import {asKeyboardEventish} from "./plugin/utils";

const manager = new RecordingManager();

const controls = [
  <RecordingControl manager={manager} plugins={[TldrawRecording]} />,
];

const playback = new Playback({duration: 60000});

export function Recording() {
  return (
    <Player controls={controls} playback={playback}>
      <div
        data-affords="click"
        style={{
          position: "absolute",
          inset: 0,
          height: "var(--lv-canvas-height)",
        }}
      >
        <Tldraw>
          <BubbleKeyboardEvents />
          <AttachEditor />
          <DetectTool />
        </Tldraw>
      </div>
    </Player>
  );
}

const DetectTool = track(function DetectTool() {
  const editor = useEditor();
  TldrawRecording.recorder.setTool(editor.getCurrentToolId());
  return null;
});

function AttachEditor() {
  const editor = useEditor();
  // console.log(editor.getCurrentToolId());

  TldrawRecording.recorder.provideEditor(editor);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).ed = editor;

  return null;
}

/** Pass keyboard shortcuts up to the Liqvid keymap */
function BubbleKeyboardEvents() {
  const editor = useEditor();
  const keymap = useKeymap();

  const handleKeyboardShortcuts = useCallback(
    (e: TLEventInfo) => {
      if (!(e.type === "keyboard" && e.name === "key_down")) return;

      // only want to do recording shortcuts
      // remove if you're changing the recording shortcuts
      if (!(e.ctrlKey && e.altKey)) return;

      keymap.handle(asKeyboardEventish(e));
    },
    [keymap],
  );

  useEffect(() => {
    editor.on("event", handleKeyboardShortcuts);

    return () => {
      editor.off("event", handleKeyboardShortcuts);
    };
  }, [editor, handleKeyboardShortcuts]);

  return null;
}
