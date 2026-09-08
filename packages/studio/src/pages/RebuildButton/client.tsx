"use client";

import { Duration } from "@liqvid/duration";
import { usePluginApi } from "@liqvid/studio-plugin-api";
import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Spinner } from "#_/components/Spinner.js";
import { useChannel } from "#_/components/WebSocketProvider.js";
import {
  publishAction,
  publishContentAction,
  publishMediaAction,
  rebuildAction,
} from "#_/pages/root-actions.js";
import { ButtonWithDropdown } from "#_/ui/ButtonWithDropdown.js";
import type { Localized } from "#_/utils/i18n.mjs";

import type TranslationsJson from "./.translations/en.json";

const spin = stylex.keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
  label: {
    alignItems: "center",
    display: "inline-flex",
    gap: "0.4em",
  },
  spinner: {
    animationDuration: "1s",
    animationIterationCount: "infinite",
    animationName: spin,
    animationTimingFunction: "linear",
  },
});

type T = Localized<typeof TranslationsJson>;

/** Publish is offered instead of rebuild within this window after a build. */
const PUBLISH_WINDOW_MS = Duration.inMilliseconds({ minutes: 5 });

/** @package */
export function RebuildButtonClient({
  lastBuildTime,
  t,
}: {
  lastBuildTime: null | number;
  t: T;
}) {
  const [isBusy, setIsBusy] = useState(false);
  const [buildTime, setBuildTime] = useState<null | number>(lastBuildTime);
  const [now, setNow] = useState(() => Date.now());
  const { makeToast } = usePluginApi();

  // Id of the in-progress rebuild job, if any. While set, the button shows a
  // spinner until the job's completion arrives over the WebSocket.
  const rebuildJobId = useRef<null | string>(null);

  // Whether the most recent build was within the publish window. When true, the
  // main button publishes; otherwise it rebuilds.
  const canPublish = buildTime !== null && now - buildTime < PUBLISH_WINDOW_MS;

  // Re-evaluate `now` so the button flips back to "Rebuild" once the window
  // elapses without another interaction.
  useEffect(() => {
    if (buildTime === null) return;

    const remaining = buildTime + PUBLISH_WINDOW_MS - Date.now();
    if (remaining <= 0) {
      setNow(Date.now());
      return;
    }

    const timeout = setTimeout(() => setNow(Date.now()), remaining);
    return () => clearTimeout(timeout);
  }, [buildTime]);

  const notify = useCallback(
    (result: { success: boolean; error?: string }, successTitle: string) => {
      if (result.success) {
        makeToast({ title: successTitle, type: "success" });
        setBuildTime(Date.now());
        setNow(Date.now());
      } else {
        makeToast({
          message: result.error,
          title: t.toast.failure,
          type: "negative",
        });
      }
    },
    [makeToast, t.toast.failure],
  );

  const run = useCallback(async (task: () => Promise<void>) => {
    setIsBusy(true);
    try {
      await task();
    } finally {
      setIsBusy(false);
    }
  }, []);

  const handleRebuild = useCallback(async () => {
    setIsBusy(true);
    try {
      // The build runs as a background job; its stdout/stderr are captured and
      // viewable on the jobs page. We keep the spinner up (isBusy) until the
      // job's completion arrives over the WebSocket (see useChannel below).
      const { jobId } = await rebuildAction();
      rebuildJobId.current = jobId;
    } catch (error) {
      rebuildJobId.current = null;
      setIsBusy(false);
      makeToast({
        message: error instanceof Error ? error.message : String(error),
        title: t.toast.failure,
        type: "negative",
      });
    }
  }, [makeToast, t.toast.failure]);

  // React to the rebuild job's completion. On success, show a success toast
  // (no link needed); on failure/cancellation, link to the jobs page so the
  // user can inspect the captured error output.
  useChannel("jobs", {
    updateJob: ({ job }) => {
      if (job.id !== rebuildJobId.current) return;
      if (job.state === "running") return;

      rebuildJobId.current = null;
      setIsBusy(false);

      if (job.state === "completed") {
        makeToast({ title: t.toast.success, type: "success" });
        setBuildTime(Date.now());
        setNow(Date.now());
      } else {
        makeToast({
          message: (
            <Link href="./jobs" rel="noreferrer">
              {t.toast.viewLogs}
            </Link>
          ),
          title: t.toast.failure,
          type: "negative",
        });
      }
    },
  });

  const handlePublish = useCallback(
    () =>
      run(async () => {
        notify(await publishAction(), t.toast.publishSuccess);
      }),
    [notify, run, t.toast.publishSuccess],
  );

  const handlePublishContent = useCallback(
    () =>
      run(async () => {
        notify(await publishContentAction(), t.toast.publishContentSuccess);
      }),
    [notify, run, t.toast.publishContentSuccess],
  );

  const handlePublishMedia = useCallback(
    () =>
      run(async () => {
        notify(await publishMediaAction(), t.toast.publishMediaSuccess);
      }),
    [notify, run, t.toast.publishMediaSuccess],
  );

  const label = isBusy ? (
    <span {...stylex.props(styles.label)}>
      <Spinner />
      {t.busy}
    </span>
  ) : canPublish ? (
    t.publish
  ) : (
    t.rebuild
  );

  return (
    <ButtonWithDropdown
      disabled={isBusy}
      dropdownLabel={t.dropdownLabel}
      onClick={canPublish ? handlePublish : handleRebuild}
      options={[
        {
          id: "publish-content",
          label: t.publishContent,
          onSelect: handlePublishContent,
        },
        {
          id: "publish-media",
          label: t.publishMedia,
          onSelect: handlePublishMedia,
        },
      ]}
      variant={canPublish ? "primary" : "default"}
    >
      {label}
    </ButtonWithDropdown>
  );
}
