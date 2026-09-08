"use client";

import * as stylex from "@stylexjs/stylex";
import Image from "next/image";

import s3Logo from "#_/icons/s3.svg";

import { type Providers, styles, type T } from "./client.tsx";
import { ProviderCard } from "./ProviderCard.tsx";
import { TextField } from "./TextField.tsx";

export function S3Provider({
  onChange,
  t,
  value,
}: {
  onChange: (value: Providers["s3"] | undefined) => void;
  t: T;
  value: Providers["s3"];
}) {
  return (
    <ProviderCard
      enabled={value !== undefined}
      icon={<Image alt="" height={24} src={s3Logo} />}
      onToggle={(enabled) =>
        onChange(enabled ? { bucket: "", domain: "" } : undefined)
      }
      title={t.providerS3}
    >
      <p {...stylex.props(styles.hint)}>{t.s3CredentialsHint}</p>
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
