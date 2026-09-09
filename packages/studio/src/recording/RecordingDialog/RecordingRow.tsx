import { Collapsible } from "@base-ui/react/collapsible";
import type { RecordingMeta } from "@liqvid/schemas";
import { usePluginApi } from "@liqvid/studio-plugin-api";
import { useToggle } from "@liqvid/utils";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { Effect } from "effect";
import type { RelativeDir } from "effect-paths";
import { Fragment, useCallback, useState } from "react";

import { clientRuntime, LiqvidStudioApiClient } from "#_/client.mjs";
import {
  colors,
  dims,
  radii,
  spacing,
  text,
  typeface,
} from "#_/design/tokens.stylex.js";
import { Button } from "#_/ui/Button.js";
import { TimeDuration } from "#_/ui/Time.js";

const slideDown = stylex.keyframes({
  from: { height: "0" },
  to: { height: "var(--collapsible-panel-height)" },
});

const slideUp = stylex.keyframes({
  from: { height: "var(--collapsible-panel-height)" },
  to: { height: "0" },
});

const spin = stylex.keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
  actions: {
    borderBottomColor: colors.graySep,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    columnGap: "8px",
    display: "flex",
    paddingBlock: spacing.lg,
    paddingInline: spacing.lg,
    rowGap: "8px",
  },

  duration: {
    fontFamily: typeface.mono,
    fontSize: text.md,
    textAlign: "right",
    width: "4em",
  },
  expandClosed: {
    animationDuration: "150ms",
    animationName: slideUp,
    animationTimingFunction: "ease-out",
    backgroundColor: colors.graySubtle,
    overflow: "hidden",
  },

  expandOpen: {
    animationDuration: "150ms",
    animationName: slideDown,
    animationTimingFunction: "ease-out",
    backgroundColor: colors.graySubtle,
    overflow: "hidden",
  },

  pluginIcons: {
    marginLeft: "auto",
  },

  recordingName: {
    fontFamily: typeface.mono,
  },

  reprocessButton: {
    alignItems: "center",
    backgroundColor: {
      ":hover": colors.grayHover,
      default: colors.grayUi,
    },
    borderColor: colors.graySep,
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    columnGap: "4px",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: text.sm,
    padding: `${spacing.md} ${spacing.lg}`,
    rowGap: "4px",
  },

  reprocessButtonDisabled: {
    backgroundColor: colors.grayUi,
    cursor: "not-allowed",
    opacity: 0.6,
  },

  spinning: {
    animationDuration: "1s",
    animationIterationCount: "infinite",
    animationName: spin,
    animationTimingFunction: "linear",
  },

  trigger: {
    alignItems: "center",
    backgroundColor: {
      ":hover": colors.grayHover,
      // eslint-disable-next-line @stylexjs/valid-styles
      default: null,
    },
    cursor: "pointer",
    display: "flex",
    padding: `${spacing.md} ${spacing.lg}`,
    width: "100%",
  },

  triggerOpen: {
    backgroundColor: colors.grayActive,
  },
});

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
    <Collapsible.Root onOpenChange={setExpanded} open={expanded}>
      <Collapsible.Trigger
        {...stylex.props(styles.trigger, expanded && styles.triggerOpen)}
      >
        <span sx={styles.recordingName}>{r.name}</span>
        <span sx={styles.pluginIcons}>
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
        <TimeDuration {...stylex.props(styles.duration)} value={r.duration} />
      </Collapsible.Trigger>
      <Collapsible.Panel
        {...stylex.props(expanded ? styles.expandOpen : styles.expandClosed)}
      >
        <div sx={styles.actions}>
          <Button
            {...stylex.props(
              styles.reprocessButton,
              isReprocessing && styles.reprocessButtonDisabled,
            )}
            disabled={isReprocessing}
            onClick={handleReprocess}
            title="Re-run post-processing plugins"
          >
            <ArrowsClockwiseIcon
              {...stylex.props(isReprocessing && styles.spinning)}
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
