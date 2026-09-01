"use client";

import { usePluginApi } from "@liqvid/studio-plugin-api";
import { ArrowClockwiseIcon, XIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import type { PackageUpdate } from "#_/jobs/check-updates.mjs";
import { updatePackageAction } from "#_/pages/root-actions.js";
import { Button } from "#_/ui/Button.js";
import { IconButton } from "#_/ui/IconButton.js";

import styles from "./UpdateBanner.module.css";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

/** Interpolate `{name}`-style placeholders in a translation string. */
function format(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) =>
    key in values ? values[key]! : `{${key}}`,
  );
}

/** @package */
export function UpdateBannerClient({
  t,
  updates,
}: {
  t: T;
  updates: PackageUpdate[];
}) {
  const router = useRouter();
  const { makeToast } = usePluginApi();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const handleUpdate = useCallback(
    async (name: string) => {
      setBusy(name);
      try {
        const result = await updatePackageAction(name);
        if (result.success) {
          makeToast({
            message: format(t.toast.successMessage, { name }),
            title: t.toast.successTitle,
            type: "success",
          });
          router.refresh();
        } else {
          makeToast({
            message: result.error,
            title: t.toast.failureTitle,
            type: "negative",
          });
        }
      } finally {
        setBusy(null);
      }
    },
    [makeToast, router, t.toast],
  );

  if (dismissed) return null;

  return (
    <div className={styles.banner} role="status">
      <span className={styles.message}>{t.message}</span>
      <ul className={styles.list}>
        {updates.map((update) => (
          <li className={styles.item} key={update.name}>
            <code className={styles.pkg}>{update.name}</code>
            <span className={styles.versions}>
              {`${update.current} \u2192 ${update.latest}`}
            </span>
            {update.range !== null ? (
              <Button
                className={styles.updateButton}
                disabled={busy !== null}
                onClick={() => handleUpdate(update.name)}
              >
                <ArrowClockwiseIcon weight="bold" />
                {busy === update.name ? t.updating : t.update}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      <IconButton
        aria-label={t.dismiss}
        className={styles.dismiss}
        onClick={() => setDismissed(true)}
        size="sm"
      >
        <XIcon weight="bold" />
      </IconButton>
    </div>
  );
}
