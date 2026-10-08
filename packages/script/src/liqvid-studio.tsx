import { SchemaDurationString } from "@liqvid/duration/effect";
import { TimeDuration } from "@liqvid/studio/ui";
import {
  packageNameToDirName,
  type RecordingComponentProps,
  usePluginApi,
} from "@liqvid/studio-plugin-api";
import { Result, Schema } from "effect";
import { useEffect, useState } from "react";
import { objectEntries } from "ts-extras";

import { TIMINGS_JSON } from "./conventions.ts";
import { icon } from "./icon.tsx";
import type { MarkerFormatted } from "./types.mts";

import styles from "./liqvid-studio.module.css";

const Timings = Schema.Record(Schema.String, SchemaDurationString);

export function RecordingComponent({
  files,
  loadFile,
  name,
}: RecordingComponentProps) {
  const { makeToast } = usePluginApi();
  const [timings, setTimings] = useState<readonly MarkerFormatted[] | null>(
    null,
  );
  const hasTimings = files.has(TIMINGS_JSON);

  useEffect(() => {
    if (!hasTimings) return;

    let active = true;

    loadFile(TIMINGS_JSON)
      .then((content) => {
        const $parsed = Schema.decodeUnknownResult(Timings)(
          JSON.parse(content),
        );

        if (Result.isFailure($parsed)) {
          console.error($parsed.failure);
          return;
        }
        const entries = objectEntries($parsed.success);

        if (active) setTimings(entries);
      })
      .catch(() => {
        if (active) setTimings(null);
      });

    return () => {
      active = false;
    };
  }, [hasTimings, loadFile]);

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(
        `import ${sanitizeName(name)}Timings from "../.liqvid/recordings/${name}/${packageNameToDirName("@liqvid/script")}/timings.json";`,
      );

      makeToast({
        message: (
          <>
            Paste it into <code>markers.ts</code>
          </>
        ),
        title: "Copied import code to clipboard",
        type: "success",
      });
    } catch (_error) {}
  };

  return (
    <div>
      <h4 className={styles.title}>
        {icon({ className: styles.icon, height: 24, width: 24 })}
        Script
      </h4>
      {timings && (
        <table className={styles.timings}>
          <thead>
            <tr>
              <th>Marker</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {timings.map(([markerName, duration]) => (
              <tr key={markerName}>
                <td>{markerName}</td>
                <td>
                  <TimeDuration
                    style={{ color: "var(--lvs-color-secondary)" }}
                    value={duration}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function sanitizeName(name: string) {
  return name.replace(/-/g, "");
}
