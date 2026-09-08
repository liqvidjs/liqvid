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
import { colors, radii, spacing } from "#_/design/tokens.stylex.js";
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
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.graySep,
    display: "flex",
    gap: "8px",
    paddingBlock: '8px',
    paddingInline: '12px',
  },

  duration: {
    fontFamily: "monospace",
    fontSize: "16px",
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
    fontFamily: "monospace",
  },

  reprocessButton: {
    alignItems: "center",
    backgroundColor: {
      ":hover": colors.grayHover,
      default: colors.grayUi,
    },
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.graySep,
    borderRadius: radii.md,
    cursor: "pointer",
    display: "inline-flex",
    fontSize: "12px",
    gap: "4px",
    padding: `${spacing.md} ${spacing.lg}`,
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
        <span {...stylex.props(styles.recordingName)}>{r.name}</span>
        <span {...stylex.props(styles.pluginIcons)}>
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
        <div {...stylex.props(styles.actions)}>
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
