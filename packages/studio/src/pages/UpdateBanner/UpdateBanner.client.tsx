"use client";

import { usePluginApi } from "@liqvid/studio-plugin-api";
import { ArrowClockwiseIcon, XIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import {
  colors,
  dims,
  radii,
  spacing,
  text,
  typeface,
} from "#_/design/tokens.stylex.js";
import type { Localized } from "#_/i18n/shared.mjs";
import type { PackageUpdate } from "#_/jobs/check-updates.mjs";
import { updatePackageAction } from "#_/pages/root-actions.js";
import type { PackageName } from "#_/types/misc.mjs";
import { Button } from "#_/ui/Button.js";
import { IconButton } from "#_/ui/IconButton.js";

import type TranslationsJson from "./.translations/en.json";

const styles = stylex.create({
  banner: {
    alignItems: "center",
    backgroundColor: colors.bannerBg,
    borderColor: colors.bannerBorder,
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.bannerColor,
    columnGap: "1rem",
    display: "flex",
    flexWrap: "wrap",
    fontSize: text.rem0875,
    marginBottom: spacing.rem1,
    paddingBlock: spacing.rem0625,
    paddingInline: spacing.rem1,
    rowGap: "0.5rem",
  },
  dismiss: {
    alignItems: "center",
    backgroundColor: {
      ":hover": colors.bannerDismissBgHover,
      default: colors.transparent,
    },
    borderRadius: radii.md,
    borderStyle: "none",
    color: {
      ":hover": colors.bannerDismissColorHover,
      default: colors.bannerDismissColor,
    },
    cursor: "pointer",
    display: "inline-flex",
    marginLeft: "auto",
    padding: spacing.rem025,
  },
  item: {
    alignItems: "center",
    columnGap: "0.5rem",
    display: "flex",
    rowGap: "0.5rem",
  },
  list: {
    alignItems: "center",
    columnGap: "1.25rem",
    display: "flex",
    flexWrap: "wrap",
    listStyle: "none",
    margin: spacing.zero,
    padding: spacing.zero,
    rowGap: "0.5rem",
  },
  message: {
    fontWeight: 600,
  },
  pkg: {
    fontFamily: typeface.uiMono,
    fontWeight: 600,
  },
  updateButton: {
    alignItems: "center",
    backgroundColor: {
      ":hover:not(:disabled)": colors.accentSolidHover,
      default: colors.accentSolid,
    },
    borderRadius: radii.md,
    borderStyle: "none",
    color: colors.bannerContrastColor,
    columnGap: spacing.em03,
    cursor: {
      ":disabled": "not-allowed",
      default: "pointer",
    },
    display: "inline-flex",
    fontSize: text.rem08125,
    fontWeight: 500,
    opacity: {
      ":disabled": 0.6,
    },
    paddingBlock: spacing.rem025,
    paddingInline: spacing.rem06,
    rowGap: spacing.em03,
    transition: "background-color 0.15s",
  },
  versions: {
    color: colors.bannerDismissColor,
  },
});

type T = Localized<typeof TranslationsJson>;

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
    async (name: PackageName) => {
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
    <div role="status" sx={styles.banner}>
      <span sx={styles.message}>{t.message}</span>
      <ul sx={styles.list}>
        {updates.map((update) => (
          <li key={update.name} sx={styles.item}>
            <code sx={styles.pkg}>{update.name}</code>
            <span sx={styles.versions}>
              {`${update.current} \u2192 ${update.latest}`}
            </span>
            {update.range !== null ? (
              <Button
                className={stylex.props(styles.updateButton).className}
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
        className={stylex.props(styles.dismiss).className}
        onClick={() => setDismissed(true)}
        size="sm"
      >
        <XIcon weight="bold" />
      </IconButton>
    </div>
  );
}
