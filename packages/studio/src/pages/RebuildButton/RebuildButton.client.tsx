"use client";

import { usePluginApi } from "@liqvid/studio-plugin-api";
import { Exit } from "effect";
import { useCallback, useEffect, useState } from "react";

import { ButtonWithDropdown } from "../../ui/ButtonWithDropdown.tsx";
import {
  publishAction,
  publishContentAction,
  publishMediaAction,
  rebuildAction,
} from "../root-actions.ts";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

/** Publish is offered instead of rebuild within this window after a build. */
const PUBLISH_WINDOW_MS = 5 * 60 * 1000;

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

  const handleRebuild = useCallback(
    () =>
      run(async () => {
        const exit = await rebuildAction();

        if (Exit.isSuccess(exit)) {
          makeToast({ title: t.toast.success, type: "success" });
          setBuildTime(Date.now());
          setNow(Date.now());
        } else {
          makeToast({
            message: exit.cause.reasons
              .flatMap((reason) => {
                if (reason._tag !== "Fail") return [];
                const { error } = reason;
                if (
                  typeof error === "object" &&
                  error !== null &&
                  "messages" in error &&
                  Array.isArray(error.messages)
                ) {
                  return error.messages as string[];
                }
                return [String(error)];
              })
              .join("\n"),
            title: t.toast.failure,
            type: "negative",
          });
        }
      }),
    [makeToast, run, t.toast.failure, t.toast.success],
  );

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

  const label = isBusy ? t.busy : canPublish ? t.publish : t.rebuild;

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
