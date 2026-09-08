"use client";

import { usePluginApi } from "@liqvid/studio-plugin-api";
import { ArrowClockwiseIcon, XIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { colors, radii } from "#_/design/tokens.stylex.js";
import type { PackageUpdate } from "#_/jobs/check-updates.mjs";
import { updatePackageAction } from "#_/pages/root-actions.js";
import type { PackageName } from "#_/types/misc.mjs";
import { Button } from "#_/ui/Button.js";
import { IconButton } from "#_/ui/IconButton.js";

import type TranslationsJson from "./.translations/en.json";

const styles = stylex.create({
  banner: {
    alignItems: "center",
    backgroundColor: "var(--accent-ui)",
    borderColor: "var(--accent-sep)",
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: "1px",
    color: "var(--accent-normal)",
    display: "flex",
    flexWrap: "wrap",
    fontSize: "0.875rem",
    rowGap: '0.5rem',
    columnGap: '1rem',
    marginBottom: "1rem",
    paddingBlock: '0.625rem',
    paddingInline: '1rem',
  },
  dismiss: {
    alignItems: "center",
    backgroundColor: {
      ":hover": "var(--accent-hover)",
      default: "transparent",
    },
    borderRadius: radii.md,
    borderStyle: "none",
    color: {
      ":hover": "var(--accent-normal)",
      default: "var(--accent-dim)",
    },
    cursor: "pointer",
    display: "inline-flex",
    marginLeft: "auto",
    padding: "0.25rem",
  },
  item: {
    alignItems: "center",
    display: "flex",
    gap: "0.5rem",
  },
  list: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    rowGap: '0.5rem',
    columnGap: '1.25rem',
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  message: {
    fontWeight: 600,
  },
  pkg: {
    fontFamily: "ui-monospace, monospace",
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
    color: "var(--accent-contrast)",
    cursor: {
      ":disabled": "not-allowed",
      default: "pointer",
    },
    display: "inline-flex",
    fontSize: "0.8125rem",
    fontWeight: 500,
    gap: "0.3em",
    opacity: {
      ":disabled": 0.6,
    },
    paddingBlock: '0.25rem',
    paddingInline: '0.6rem',
    transition: "background-color 0.15s",
  },
  versions: {
    color: "var(--accent-dim)",
  },
});

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
    <div {...stylex.props(styles.banner)} role="status">
      <span {...stylex.props(styles.message)}>{t.message}</span>
      <ul {...stylex.props(styles.list)}>
        {updates.map((update) => (
          <li {...stylex.props(styles.item)} key={update.name}>
            <code {...stylex.props(styles.pkg)}>{update.name}</code>
            <span {...stylex.props(styles.versions)}>
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
