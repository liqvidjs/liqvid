import { Collapsible } from "@base-ui/react/collapsible";
import type { RecordingMeta } from "@liqvid/schemas";
import { usePluginApi } from "@liqvid/studio-plugin-api";
import { useToggle } from "@liqvid/utils";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react";
import { Effect } from "effect";
import type { RelativeDir } from "effect-paths";
import { Fragment, useCallback, useState } from "react";

import { clientRuntime, LiqvidStudioApiClient } from "#_/client.mjs";
import { Button } from "#_/ui/Button.js";
import { TimeDuration } from "#_/ui/Time.js";

import styles from "./RecordingDialog.module.css";

/** @package */
export function RecordingRow({
  projectParams,
  projectPath,
  recording: r,
}: {
  projectParams: Record<string, string>;
  projectPath: RelativeDir;
  recording: RecordingMeta;
}) {
  const { value: expanded, set: setExpanded } = useToggle();
  const [isReprocessing, setIsReprocessing] = useState(false);

  const { plugins } = usePluginApi();

  const handleReprocess = useCallback(() => {
    setIsReprocessing(true);
    clientRuntime
      .runPromise(
        Effect.gen(function* () {
          const client = yield* LiqvidStudioApiClient;

          yield* client.recordings.reprocess({
            payload: { recordingName: r.name },
            query: {
              params:
                Object.keys(projectParams).length > 0
                  ? JSON.stringify(projectParams)
                  : undefined,
              projectPath,
            },
          });
        }),
      )
      .finally(() => {
        setIsReprocessing(false);
      });
  }, [projectParams, projectPath, r.name]);

  return (
    <Collapsible.Root
      className={styles.RecordingRow}
      onOpenChange={setExpanded}
      open={expanded}
    >
      <Collapsible.Trigger className={styles.RecordingRowTrigger}>
        <span className={styles.recordingName}>{r.name}</span>
        <span className={styles.pluginIcons}>
          {r.plugins.map((p) =>
            Object.hasOwn(plugins, p) ? (
              <Fragment key={p}>{plugins[p]!.icon()}</Fragment>
            ) : null,
          )}
        </span>
        {/* <time style={{ fontSize: "12px" }}> */}
        {/*   {new Intl.DateTimeFormat("en-US").format(new Date(r.created))} */}
        {/* </time> */}
        {/**/}
        <TimeDuration className={styles.recordingDuration} value={r.duration} />
      </Collapsible.Trigger>
      <Collapsible.Panel className={styles.RecordingRowExpand}>
        <div className={styles.recordingActions}>
          <Button
            className={styles.reprocessButton}
            disabled={isReprocessing}
            onClick={handleReprocess}
            title="Re-run post-processing plugins"
          >
            <ArrowsClockwiseIcon
              className={isReprocessing ? styles.spinning : undefined}
              size={16}
            />
            {isReprocessing ? "Reprocessing..." : "Reprocess"}
          </Button>
        </div>
        {r.plugins.map((p) => {
          const plugin = plugins[p];

          if (!plugin) return null;

          const Component = plugin.recordingComponent;
          if (!Component) return null;

          return <Component key={plugin.package} name={r.name} />;
        })}
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
