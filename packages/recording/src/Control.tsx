"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import {Keymap} from "@liqvid/keymap";
import {useKeymap} from "@liqvid/keymap/react";
import {onClick, useForceUpdate} from "@liqvid/utils/react";

import type {RecorderPlugin} from "./types";
import {RecordingManager} from "./RecordingManager";

import RecordingRow from "./RecordingRow";
import {Recorder} from "./recorder";

interface Props {
  manager?: RecordingManager;
  plugins?: RecorderPlugin<unknown, unknown>[];
}

interface Action {
  command: keyof State;
  seq: string;
}

interface State {
  start: string;
  pause: string;
  discard: string;
}

/**
 * Liqvid recording control.
 */
export function RecordingControl(props: Props) {
  const keymap = useKeymap();

  const [recordings, setRecordings] = useState([]);
  const forceUpdate = useForceUpdate();

  // recording manager
  const manager = useRef<RecordingManager>();

  useEffect(() => {
    manager.current = props.manager ?? new RecordingManager();

    const eventNames = ["finalize", "start", "pause", "resume"] as const;

    for (const eventName of eventNames) {
      manager.current.on(eventName, forceUpdate);
    }

    return () => {
      for (const eventName of eventNames) {
        manager.current.off(eventName, forceUpdate);
      }
    };
  }, [forceUpdate, props.manager]);

  // active plugins
  const activePlugins = useRef<{[key: string]: boolean}>(null);
  if (activePlugins.current === null) {
    activePlugins.current = {};

    for (const plugin of props.plugins) {
      activePlugins.current[plugin.key] = false;
    }
  }

  // plugins dictionary
  const [pluginsByKey] = useState(() => {
    const dict: Record<string, RecorderPlugin<unknown, unknown>> = {};
    for (const plugin of props.plugins) {
      dict[plugin.key] = plugin;
    }
    return dict;
  });

  /* commands */
  const start = useCallback(() => {
    const {active, beginRecording, endRecording} = manager.current;
    if (active) {
      endRecording().then((recording: Record<string, unknown>) => {
        recording.duration = manager.current.duration;
        setRecordings((prev) => prev.concat(recording));
      });
    } else {
      const recorders: Record<string, Recorder<unknown, unknown>> = {};
      for (const plugin of props.plugins) {
        if (activePlugins.current[plugin.key]) {
          recorders[plugin.key] = plugin.recorder;
        }
      }
      beginRecording(recorders);
    }
  }, [props.plugins]);

  const pause = useCallback(() => {
    const {active, paused, pauseRecording, resumeRecording} = manager.current;
    if (active) {
      paused ? resumeRecording() : pauseRecording();
    }
  }, []);

  const discard = useCallback(async () => {
    const {active, endRecording} = manager.current;
    if (active) {
      const listeners = manager.current.listeners("finalize") as Parameters<
        typeof manager.current.on
      >[1][];
      for (const listener of listeners) {
        manager.current.off("finalize", listener);
      }
      try {
        await endRecording();
      } catch (e) {
        console.error(e);
      }

      for (const listener of listeners) {
        manager.current.on("finalize", listener);
      }

      forceUpdate();
    }
  }, [forceUpdate]);

  /* keyboard controls */
  const callbacks: Record<keyof State, (e: KeyboardEvent) => void> = useMemo(
    () => ({start, pause, discard}),
    [discard, pause, start]
  );

  const reducer: React.Reducer<State, Action> = useCallback((state, action) => {
    // return new state
    return {
      ...state,
      [action.command]: action.seq,
    };
  }, []);

  const [state, dispatch] = useReducer(reducer, null, () => ({
    start: isMac() ? "Alt+Meta+2" : "Ctrl+Alt+2",
    pause: isMac() ? "Alt+Meta+3" : "Ctrl+Alt+3",
    discard: isMac() ? "Alt+Meta+4" : "Ctrl+Alt+4",
  }));

  // bind
  useEffect(() => {
    for (const key of Object.keys(state) as (keyof State)[]) {
      keymap.bind(state[key], callbacks[key]);
    }

    return () => {
      for (const key of Object.keys(state) as (keyof State)[]) {
        keymap.unbind(state[key], callbacks[key]);
      }
    };
  }, [callbacks, keymap, state]);

  // onBlur event, triggers rebind
  const onBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    e.preventDefault();

    const name = e.currentTarget.getAttribute("name") as keyof State;

    // bind sequence
    const seq = e.currentTarget.dataset.value;
    dispatch({command: name, seq});
  }, []);

  // display shortcut sequence
  const identifyKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.preventDefault();

      const seq = Keymap.identify(e as unknown as KeyboardEvent);
      e.currentTarget.dataset.value = seq;
      e.currentTarget.value = fmtSeq(seq);
    },
    []
  );

  // warn before closing if recordings exist
  const warn = useRef(false);
  warn.current = recordings.length > 0;

  useEffect(() => {
    window.addEventListener("beforeunload", (e: BeforeUnloadEvent) => {
      if (warn.current) e.returnValue = "You have recording data";
    });
  }, []);

  // show/hide control pane
  const [paneOpen, setPaneOpen] = useState(false);
  const togglePane = useMemo(
    () =>
      onClick(() => {
        setPaneOpen((prev) => !prev);
      }),
    []
  );

  const dialogStyle = {
    display: paneOpen ? "block" : "none",
  };

  // toggle plugin
  const setActive = useMemo(
    () =>
      onClick<SVGSVGElement>((e) => {
        const key = e.currentTarget.dataset.plugin;
        activePlugins.current[key] = !activePlugins.current[key];
        forceUpdate();
      }),
    [forceUpdate]
  );

  /* render */
  const commands: [string, keyof State][] = [
    ["Start/Stop recording", "start"],
    ["Pause recording", "pause"],
    ["Discard recording", "discard"],
  ];

  return (
    <div id="lv-recording">
      <div id="lv-recording-dialog" style={dialogStyle}>
        <table id="lv-recording-configuration">
          <tbody>
            <tr>
              <th colSpan={2}>Commands</th>
            </tr>
            {commands.map(([desc, key]) => (
              <tr key={key}>
                <th scope="row">{desc}</th>
                <td>
                  <input
                    onBlur={onBlur}
                    readOnly
                    onKeyDown={identifyKey}
                    className="shortcut"
                    name={key}
                    type="text"
                    value={fmtSeq(state[key])}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Configuration</h3>
        {props.plugins.map((plugin) => {
          const classNames = ["recorder-plugin-icon"];

          if (activePlugins.current[plugin.key]) classNames.push("active");

          const styles: React.CSSProperties = {};
          const enabled =
            typeof plugin.enabled === "undefined" || plugin.enabled();
          if (!enabled) {
            styles.opacity = 0.3;
          }

          return (
            <div
              className="recorder-plugin"
              key={plugin.key}
              title={plugin.title}
              style={styles}
            >
              <svg
                className={classNames.join(" ")}
                height="36"
                width="36"
                viewBox="0 0 100 100"
                data-plugin={plugin.key}
                {...(enabled ? setActive : {})}
              >
                <rect
                  height="100"
                  width="100"
                  fill={activePlugins.current[plugin.key] ? "red" : "#222"}
                />
                {plugin.icon}
              </svg>
              <span className="recorder-plugin-name">{plugin.name}</span>
            </div>
          );
        })}

        <h3>Saved data</h3>
        <ol className="recordings">
          {recordings.map((recording, i) => (
            <RecordingRow
              key={i}
              data={recording}
              pluginsByKey={pluginsByKey}
            />
          ))}
        </ol>
      </div>
      <svg height="36" width="36" viewBox="-50 -50 100 100" {...togglePane}>
        <circle
          cx="0"
          cy="0"
          r="35"
          stroke="white"
          strokeWidth="5"
          fill={
            manager.current?.active
              ? manager.current?.paused
                ? "yellow"
                : "red"
              : "#666"
          }
        />
      </svg>
    </div>
  );
}

/** Format key sequences with special characters on Mac */
function fmtSeq(str: string) {
  if (!isMac()) return str;
  if (str === void 0) return str;
  return str
    .split("+")
    .map((k) => {
      if (k === "Ctrl") return "^";
      else if (k === "Alt") return "⌥";
      if (k === "Shift") return "⇧";
      if (k === "Meta") return "⌘";
      return k;
    })
    .join("");
}

function isMac() {
  return (
    typeof globalThis.navigator !== "undefined" &&
    navigator.platform === "MacIntel"
  );
}
