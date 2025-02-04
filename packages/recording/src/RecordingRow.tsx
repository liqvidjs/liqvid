import {formatTimeMs} from "@liqvid/utils/time";
import {useCallback, useState} from "react";

import type {RecorderPlugin} from "./types";

interface Props {
  data: {
    duration: number;
    [key: string]: unknown;
  };
  pluginsByKey: {
    [key: string]: RecorderPlugin<unknown, unknown>;
  };
}

export default function RecordingRow(props: Props) {
  const [name, setName] = useState("Untitled");

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  }, []);

  const {data, pluginsByKey} = props;

  return (
    <li className="recording-row">
      <input
        className="recording-name"
        onChange={onChange}
        type="text"
        value={name}
      />
      <table className="recording-results">
        <caption>
          Duration: {data.duration} ({formatTimeMs(data.duration)})
        </caption>
        <tbody>
          {Object.keys(data).map((pluginKey) => {
            if (pluginKey === "duration") return null;
            const plugin = pluginsByKey[pluginKey],
              SaveComponent = plugin.saveComponent;

            return (
              <tr key={pluginKey}>
                <th key="head" scope="row" title={plugin.name}>
                  <svg
                    className="recorder-plugin-icon"
                    height="36"
                    width="36"
                    viewBox="0 0 100 100"
                  >
                    <rect height="100" width="100" fill="#222" />
                    {plugin.icon}
                  </svg>
                </th>
                <td key="cell">
                  <SaveComponent data={data[pluginKey]} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </li>
  );
}
