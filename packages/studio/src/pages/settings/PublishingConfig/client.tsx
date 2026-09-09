"use client";

import { FloppyDiskIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { Effect, Exit } from "effect";
import { useMemo, useState } from "react";

import type { SettingsConfig } from "#_/api/contract.mjs";
import { clientRuntime, LiqvidStudioApiClient } from "#_/client.mjs";
import { Spinner } from "#_/components/Spinner.js";
import { Description, fonts } from "#_/design/styles.js";
import {
  breakpoints,
  colors,
  dims,
  radii,
  shadows,
  spacing,
  text,
} from "#_/design/tokens.stylex.js";
import type { Localized, LocalizedReactNode } from "#_/i18n/shared.mjs";
import { interpolated, PlainString } from "#_/i18n/shared.mjs";
import { Button } from "#_/ui/Button.js";
import { FieldSet, Legend } from "#_/ui/Fieldset.js";
import {
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectRoot,
  SelectTrigger,
  SelectValue,
} from "#_/ui/Select.js";

import { CopyProvider } from "./CopyProvider.tsx";
import { EnvVarInput } from "./EnvVarInput.tsx";
import { GitHubPagesProvider } from "./GitHubPagesProvider.tsx";
import { LiqvidStudioProvider } from "./LiqvidStudioProvider.tsx";
import { S3Provider } from "./S3Provider.tsx";
import { SftpProvider } from "./SftpProvider.tsx";

import type TranslationsJson from "./.translations/en.json";

export type T = Localized<typeof TranslationsJson>;

const styles = stylex.create({

  checkboxField: {
    alignItems: "center",
    cursor: "pointer",
    display: "flex",
    gap: spacing.md,
    marginTop: spacing.lg,
  },

  /* ---- config form ---- */

  configForm: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.lg,
    marginTop: spacing.lg,
  },

  error: {
    color: colors.errorText,
    margin: `${spacing.md} 0 0`,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
    marginTop: spacing.lg,
  },

  fieldLabel: {
    color: colors.grayDim,
    fontSize: text.sm,
  },

  positioner: {
    zIndex: 30,
  },

  saveButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    background: {
      ":hover:not(:disabled)": colors.accentSolidHover,
      default: colors.accentSolid,
    },
    borderRadius: radii.lg,
    borderStyle: "none",
    color: colors.white,
    cursor: {
      ":disabled": "default",
      default: "pointer",
    },
    display: "flex",
    fontSize: text.base,
    gap: spacing.md,
    opacity: {
      ":disabled": 0.6,
      default: null,
    },
    padding: `${spacing.md} ${spacing.xl}`,
  },
});

/** Providers that can host content files. */
const CONTENT_PROVIDERS = [
  "copy",
  "githubPages",
  "liqvidStudio",
  "s3",
  "sftp",
] as const;

/** Providers that can host media files. */
const MEDIA_PROVIDERS = ["copy", "liqvidStudio", "s3", "sftp"] as const;

type ContentProvider = (typeof CONTENT_PROVIDERS)[number];
type MediaProvider = (typeof MEDIA_PROVIDERS)[number];

/** Sentinel value used by selects to represent "no provider chosen". */
const NONE = "__none__";

/**
 * @package
 * Editor for the `backend`, `basePath`, `media`, and `providers` fields of
 * `liqvid.json`.
 */
export function PublishingConfigClient({
  config,
  t,
}: {
  config: SettingsConfig;
  t: T;
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function save(next: SettingsConfig) {
    setSaving(true);
    setSaveError(null);

    const result = await clientRuntime.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;
        return yield* client.settings.setConfig({ payload: next });
      }),
    );

    setSaving(false);

    if (!Exit.isSuccess(result)) {
      setSaveError(String(result.cause));
    }
  }

  return (
    <ConfigForm
      initial={config}
      onSave={save}
      saveError={saveError}
      saving={saving}
      t={t}
    />
  );
}

function ConfigForm({
  initial,
  onSave,
  saveError,
  saving,
  t,
}: {
  initial: SettingsConfig;
  onSave: (next: SettingsConfig) => void;
  saveError: string | null;
  saving: boolean;
  t: T;
}) {
  const [draft, setDraft] = useState<SettingsConfig>(initial);
  const $t = useMemo(() => interpolated(t), [t]);

  function patch(next: Partial<SettingsConfig>) {
    setDraft((d) => ({ ...d, ...next }));
  }

  const contentBackend = draft.backend?.content ?? NONE;
  const mediaBackend = draft.backend?.media ?? NONE;

  function setBackend(key: "content" | "media", value: string) {
    const backend = { ...draft.backend };
    if (value === NONE) {
      delete backend[key];
    } else if (key === "content") {
      backend.content = value as ContentProvider;
    } else {
      backend.media = value as MediaProvider;
    }
    patch({
      backend: Object.keys(backend).length === 0 ? undefined : backend,
    });
  }

  const providers = draft.providers ?? {};

  function setProvider(
    key: keyof NonNullable<SettingsConfig["providers"]>,
    value: unknown,
  ) {
    const nextProviders = { ...providers, [key]: value };
    if (value === undefined) delete nextProviders[key];
    patch({
      providers:
        Object.keys(nextProviders).length === 0 ? undefined : nextProviders,
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
      sx={styles.configForm}
    >
      {/* ---------------------------- backend ---------------------------- */}
      <FieldSet>
        <Legend>{t.backend}</Legend>
        <p sx={fonts.description}>{t.backendDescription}</p>

        <div sx={styles.field}>
          <span sx={styles.fieldLabel}>{t.contentBackend}</span>
          <ProviderSelect
            emptyLabel={t.notConfigured}
            onValueChange={(v) => setBackend("content", v)}
            options={CONTENT_PROVIDERS}
            value={contentBackend}
          />
        </div>

        <div sx={styles.field}>
          <span sx={styles.fieldLabel}>{t.mediaBackend}</span>
          <ProviderSelect
            emptyLabel={t.notConfigured}
            onValueChange={(v) => setBackend("media", v)}
            options={MEDIA_PROVIDERS}
            value={mediaBackend}
          />
        </div>
      </FieldSet>

      {/* ---------------------------- basePath ---------------------------- */}
      <FieldSet>
        <Legend>{t.basePath}</Legend>
        <p sx={fonts.description}>
          {$t.basePathDescription({
            var: <var sx={fonts.var}>{PlainString("basePath")}</var>,
          })}
        </p>

        <EnvVarInput
          onChange={(v) => patch({ basePath: v === "" ? undefined : v })}
          placeholder="/my-project"
          t={{
            envVarEnvFile: t.envVarEnvFile,
            envVarEnvFileHint: t.envVarEnvFileHint,
            envVarMode: t.envVarMode,
            envVarName: t.envVarName,
            envVarOption: t.envVarOption,
            valueOption: t.valueOption,
          }}
          value={draft.basePath}
        />
      </FieldSet>

      {/* ----------------------------- media ----------------------------- */}
      <FieldSet>
        <Legend>{t.media}</Legend>
        <Description>{t.mediaDescription}</Description>

        <label sx={styles.checkboxField}>
          <input
            checked={draft.media?.audio?.multiple ?? false}
            onChange={(e) => {
              const multiple = e.target.checked;
              patch({
                media: multiple ? { audio: { multiple } } : undefined,
              });
            }}
            type="checkbox"
          />
          <span>{t.audioMultiple}</span>
        </label>
      </FieldSet>

      {/* --------------------------- providers --------------------------- */}
      <FieldSet>
        <Legend>{t.providers}</Legend>
        <Description>{t.providersDescription}</Description>

        <CopyProvider
          onChange={(v) => setProvider("copy", v)}
          t={t}
          value={providers.copy}
        />
        <GitHubPagesProvider
          onChange={(v) => setProvider("githubPages", v)}
          t={t}
          value={providers.githubPages}
        />
        <LiqvidStudioProvider
          onChange={(v) => setProvider("liqvidStudio", v)}
          t={t}
          value={providers.liqvidStudio}
        />
        <S3Provider
          onChange={(v) => setProvider("s3", v)}
          t={t}
          value={providers.s3}
        />
        <SftpProvider
          onChange={(v) => setProvider("sftp", v)}
          t={t}
          value={providers.sftp}
        />
      </FieldSet>

      {saveError && <p sx={styles.error}>{`${t.saveError}: ${saveError}`}</p>}

      <Button
        {...stylex.props(styles.saveButton)}
        disabled={saving}
        type="submit"
      >
        {saving ? <Spinner /> : <FloppyDiskIcon weight="bold" />}
        {t.save}
      </Button>
    </form>
  );
}

/* ------------------------------ primitives ------------------------------ */

function ProviderSelect({
  emptyLabel,
  onValueChange,
  options,
  value,
}: {
  emptyLabel: LocalizedReactNode;
  onValueChange: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  const items: Record<string, LocalizedReactNode> = {
    [NONE]: emptyLabel,
    ...Object.fromEntries(options.map((o) => [o, o])),
  };

  return (
    <SelectRoot
      items={items}
      onValueChange={(v) => onValueChange(v as string)}
      value={value}
    >
      <SelectTrigger>
        <SelectValue>{(v: string) => items[v] ?? emptyLabel}</SelectValue>
        <SelectIcon />
      </SelectTrigger>

      <SelectPortal>
        <SelectPositioner
          alignItemWithTrigger={false}
          {...stylex.props(styles.positioner)}
          sideOffset={4}
        >
          <SelectPopup>
            {Object.entries(items).map(([code, label]) => (
              <SelectItem key={code} value={code}>
                <SelectItemText>{label}</SelectItemText>
                <SelectItemIndicator />
              </SelectItem>
            ))}
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </SelectRoot>
  );
}

export type Providers = NonNullable<SettingsConfig["providers"]>;
