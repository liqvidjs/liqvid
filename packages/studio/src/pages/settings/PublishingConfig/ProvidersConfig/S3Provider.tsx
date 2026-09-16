"use client";

import { CONFIG_FILE } from "@liqvid/cli/utils";
import * as stylex from "@stylexjs/stylex";
import Image from "next/image";

import { fonts } from "#_/design/styles.js";
import { colors, spacing, text } from "#_/design/tokens.stylex.js";
import type { Localized } from "#_/i18n/shared.mjs";
import s3Logo from "#_/icons/s3.svg";
import { TextField } from "#_/ui/TextField.js";
import { useTranslations } from "#_/utils/react.js";

import type { Providers } from "../client.tsx";

import { ProviderCard } from "./ProviderCard.tsx";

import type Translations from "./.translations/en.json";

type T = Localized<typeof Translations>;

const styles = stylex.create({
  hint: {
    color: colors.grayDim,
    fontSize: text.sm,
    margin: `${spacing.md} 0 0`,
  },
});

export function S3Provider({
  onChange,
  value,
}: {
  onChange: (value: Providers["s3"] | undefined) => void;
  value: Providers["s3"];
}) {
  const t = useTranslations<T>();

  return (
    <ProviderCard
      enabled={value !== undefined}
      icon={<Image alt="" height={24} src={s3Logo} />}
      onToggle={(enabled) =>
        onChange(enabled ? { bucket: "", domain: "" } : undefined)
      }
      title={t.providerS3}
    >
      <p sx={styles.hint}>
        {t.s3CredentialsHint({
          filename: (
            <span {...stylex.props(fonts.filename)}>{CONFIG_FILE}</span>
          ),
        })}
      </p>
      <TextField
        label={t.s3Bucket}
        onChange={(v) => onChange({ domain: "", ...value, bucket: v })}
        value={value?.bucket ?? ""}
      />
      <TextField
        label={t.s3Domain}
        onChange={(v) => onChange({ bucket: "", ...value, domain: v })}
        value={value?.domain ?? ""}
      />
      <TextField
        label={t.s3Region}
        onChange={(v) =>
          onChange({
            bucket: value?.bucket ?? "",
            domain: value?.domain ?? "",
            ...value,
            region: v === "" ? undefined : v,
          })
        }
        placeholder="us-east-1"
        value={value?.region ?? ""}
      />
      <TextField
        label={t.s3Prefix}
        onChange={(v) =>
          onChange({
            bucket: value?.bucket ?? "",
            domain: value?.domain ?? "",
            ...value,
            prefix: v === "" ? undefined : v,
          })
        }
        value={value?.prefix ?? ""}
      />
    </ProviderCard>
  );
}
