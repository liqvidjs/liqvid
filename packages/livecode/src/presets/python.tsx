import { python } from "@codemirror/lang-python";
import type { Extension } from "@codemirror/state";
import { CodeRecording } from "@lqv/codemirror/recording";
import { useEffect } from "react";

import { Clear } from "../buttons/Clear.tsx";
// import { Copy } from "../buttons/Copy";
import { Reset } from "../buttons/Reset.tsx";
import { Run } from "../buttons/Run.tsx";
import { Console } from "../components/Console.tsx";
import { Editor } from "../components/Editor.tsx";
import { EditorGroup } from "../components/EditorGroup.tsx";
import { Tab, TabList } from "../components/group-tabs.tsx";
import { Record } from "../components/Record.tsx";
import { Replay } from "../components/Replay.tsx";
import { Resize } from "../components/Resize.tsx";
import { LiveCode } from "../components/Root.tsx";
import { basicSetup } from "../extensions.ts";
import { PythonInterpreter } from "../interpreters/skulpt.ts";
import { useLiveCodeStore } from "../store.ts";

const interpreter = new PythonInterpreter();

/** Python demo */
export const PythonDemo: React.FC<{
  /** File contents. */
  content?: string;

  /**
   * CodeMirror extensions to add.
   * @default []
   */
  extensions?: Extension[];
}> = (props) => {
  const { extensions = [] } = props;

  return (
    <LiveCode>
      <Editor
        content={props.content}
        extensions={[basicSetup, python(), ...extensions]}
        filename="untitled.py"
      />
      <Resize />
      <PythonRun />
      <Console />
      <Buttons>
        <Reset />
        <Run />
        <Clear />
      </Buttons>
    </LiveCode>
  );
};

/** Record Python coding. */
export const PythonRecord: React.FC<{
  /** File contents. */
  content?: string;

  /**
   * CodeMirror extensions to add.
   * @default []
   */
  extensions?: Extension[];
}> = (props) => {
  const { extensions = [] } = props;

  return (
    <LiveCode recorder={CodeRecording.recorder}>
      <Record
        content={props.content}
        extensions={[python(), basicSetup, ...extensions]}
        filename="untitled.py"
      />
      <Resize />
      <PythonRun />
      <Console />
      <Buttons>
        <Run />
        <Clear />
      </Buttons>
    </LiveCode>
  );
};

/** Interactive Python replay. */
export const PythonReplay: React.FC<{
  children?: React.ReactNode;

  /** File contents. */
  content?: string;

  /**
   * CodeMirror extensions to add.
   * @default []
   */
  extensions?: Extension[];

  /** Coding data to replay. */
  replay: React.ComponentProps<typeof Replay>["replay"];

  /**
   * When replay should start.
   * @default 0
   */
  start?: number;
}> = (props) => {
  const { extensions = [] } = props;

  return (
    <LiveCode>
      <EditorGroup name="replay">
        <Replay
          content={props.content}
          extensions={[basicSetup, python(), ...extensions]}
          filename="untitled.py"
          replay={props.replay}
          start={props.start}
        />
      </EditorGroup>
      <EditorGroup name="playground">
        <Editor
          content={props.content}
          extensions={[basicSetup, python(), ...extensions]}
          filename="untitled.py"
        />
      </EditorGroup>
      <Resize />
      <PythonRun />
      <Console />
      <Buttons>
        <TabList>
          <Tab id="replay">Replay</Tab>
          <Tab id="playground">Playground</Tab>
        </TabList>
        <Copy from="replay" to="playground" />
        <Run />
        <Clear />
      </Buttons>
      {props.children}
    </LiveCode>
  );
};

/** Run Python code. */
export const PythonRun: React.FC = () => {
  const store = useLiveCodeStore();

  useEffect(() => {
    return store.subscribe(
      (state) => state.run,
      () => {
        const state = store.getState();
        const view = state.getActiveView();
        const code = view.state.doc.toString();
        let output: React.ReactNode[] = [];
        try {
          output = interpreter
            .runSync(code)
            .map((log) => <pre key={Math.random()}>{log}</pre>);
        } catch (e) {
          const msg = `Error (line ${e.traceback[0].lineno}): ${e.args.v[0].v}`;
          output = [
            <pre className="error" key={`${msg}-${Math.random()}`}>
              {msg}
            </pre>,
          ];
        }
        store.setState((prev) => ({
          messages: [...prev.messages, ...output],
        }));
      },
    );
  }, [store]);
  return null;
};
