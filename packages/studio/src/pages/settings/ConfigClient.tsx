"use client";

// biome-ignore lint/style/noRestrictedImports: no styled wrapper exists yet
import { Select } from "@base-ui/react/select";
import {
  CaretUpDownIcon,
  CheckIcon,
  FloppyDiskIcon,
  SpinnerIcon,
} from "@phosphor-icons/react";
import { Effect, Exit } from "effect";
import { useState } from "react";

import type { SettingsConfig } from "../../api/contract.mts";
import { clientRuntime, LiqvidStudioApiClient } from "../../client.mts";

import styles from "./settings.module.css";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

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
 * Editor for the `backend`, `basePath`, `media`, and `providers` fields of
 * `liqvid.json`.
 */
export function ConfigClient({ config, t }: { config: SettingsConfig; t: T }) {
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
      className={styles.configForm}
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
    >
      {/* ---------------------------- backend ---------------------------- */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{t.backend}</legend>
        <p className={styles.description}>{t.backendDescription}</p>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t.contentBackend}</span>
          <ProviderSelect
            emptyLabel={t.notConfigured}
            onValueChange={(v) => setBackend("content", v)}
            options={CONTENT_PROVIDERS}
            value={contentBackend}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t.mediaBackend}</span>
          <ProviderSelect
            emptyLabel={t.notConfigured}
            onValueChange={(v) => setBackend("media", v)}
            options={MEDIA_PROVIDERS}
            value={mediaBackend}
          />
        </div>
      </fieldset>

      {/* ---------------------------- basePath ---------------------------- */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{t.basePath}</legend>
        <p className={styles.description}>{t.basePathDescription}</p>

        <input
          className={styles.input}
          onChange={(e) =>
            patch({
              basePath: e.target.value === "" ? undefined : e.target.value,
            })
          }
          placeholder="/my-project"
          type="text"
          value={draft.basePath ?? ""}
        />
      </fieldset>

      {/* ----------------------------- media ----------------------------- */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{t.media}</legend>
        <p className={styles.description}>{t.mediaDescription}</p>

        <label className={styles.checkboxField}>
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
      </fieldset>

      {/* --------------------------- providers --------------------------- */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{t.providers}</legend>
        <p className={styles.description}>{t.providersDescription}</p>

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
      </fieldset>

      {saveError && (
        <p className={styles.error}>{`${t.saveError}: ${saveError}`}</p>
      )}

      <button className={styles.saveButton} disabled={saving} type="submit">
        {saving ? (
          <SpinnerIcon className={styles.spinner} weight="bold" />
        ) : (
          <FloppyDiskIcon weight="bold" />
        )}
        {t.save}
      </button>
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
  emptyLabel: string;
  onValueChange: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  const items: Record<string, string> = {
    [NONE]: emptyLabel,
    ...Object.fromEntries(options.map((o) => [o, o])),
  };

  return (
    <Select.Root
      items={items}
      onValueChange={(v) => onValueChange(v as string)}
      value={value}
    >
      <Select.Trigger className={styles.trigger}>
        <Select.Value>{(v: string) => items[v] ?? emptyLabel}</Select.Value>
        <Select.Icon>
          <CaretUpDownIcon />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner
          alignItemWithTrigger={false}
          className={styles.positioner}
          sideOffset={4}
        >
          <Select.Popup className={styles.popup}>
            {Object.entries(items).map(([code, label]) => (
              <Select.Item className={styles.item} key={code} value={code}>
                <Select.ItemText className={styles.name}>
                  {label}
                </Select.ItemText>
                <Select.ItemIndicator className={styles.check}>
                  <CheckIcon weight="bold" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

function TextField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        className={styles.input}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </label>
  );
}

function ProviderCard({
  children,
  enabled,
  onToggle,
  title,
}: {
  children: React.ReactNode;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  title: string;
}) {
  return (
    <div className={styles.providerCard}>
      <label className={styles.checkboxField}>
        <input
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          type="checkbox"
        />
        <span className={styles.providerTitle}>{title}</span>
      </label>
      {enabled && <div className={styles.providerFields}>{children}</div>}
    </div>
  );
}

/* ------------------------------ providers ------------------------------ */

type Providers = NonNullable<SettingsConfig["providers"]>;

function CopyProvider({
  onChange,
  t,
  value,
}: {
  onChange: (value: Providers["copy"] | undefined) => void;
  t: T;
  value: Providers["copy"];
}) {
  const destination =
    typeof value?.destination === "string" ? value.destination : "";

  return (
    <ProviderCard
      enabled={value !== undefined}
      onToggle={(enabled) =>
        onChange(enabled ? { destination: "" } : undefined)
      }
      title={t.providerCopy}
    >
      <TextField
        label={t.copyDestination}
        onChange={(v) => onChange({ ...value, destination: v })}
        placeholder="./dist"
        value={destination}
      />
      <label className={styles.checkboxField}>
        <input
          checked={value?.clean ?? false}
          onChange={(e) =>
            onChange({
              destination: value?.destination ?? "",
              ...value,
              clean: e.target.checked,
            })
          }
          type="checkbox"
        />
        <span>{t.copyClean}</span>
      </label>
    </ProviderCard>
  );
}

function GitHubPagesProvider({
  onChange,
  t,
  value,
}: {
  onChange: (value: Providers["githubPages"] | undefined) => void;
  t: T;
  value: Providers["githubPages"];
}) {
  return (
    <ProviderCard
      enabled={value !== undefined}
      onToggle={(enabled) =>
        onChange(enabled ? { repository: "", username: "" } : undefined)
      }
      title={t.providerGitHubPages}
    >
      <TextField
        label={t.username}
        onChange={(v) => onChange({ repository: "", ...value, username: v })}
        value={value?.username ?? ""}
      />
      <TextField
        label={t.repository}
        onChange={(v) => onChange({ username: "", ...value, repository: v })}
        value={value?.repository ?? ""}
      />
      <label className={styles.checkboxField}>
        <input
          checked={value?.root ?? false}
          onChange={(e) =>
            onChange({
              repository: value?.repository ?? "",
              username: value?.username ?? "",
              ...value,
              root: e.target.checked,
            })
          }
          type="checkbox"
        />
        <span>{t.githubRoot}</span>
      </label>
    </ProviderCard>
  );
}

function LiqvidStudioProvider({
  onChange,
  t,
  value,
}: {
  onChange: (value: Providers["liqvidStudio"] | undefined) => void;
  t: T;
  value: Providers["liqvidStudio"];
}) {
  return (
    <ProviderCard
      enabled={value !== undefined}
      onToggle={(enabled) => onChange(enabled ? { username: "" } : undefined)}
      title={t.providerLiqvidStudio}
    >
      <TextField
        label={t.username}
        onChange={(v) => onChange({ username: v })}
        value={value?.username ?? ""}
      />
    </ProviderCard>
  );
}

function S3Provider({
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
      onToggle={(enabled) =>
        onChange(enabled ? { bucket: "", domain: "" } : undefined)
      }
      title={t.providerS3}
    >
      <p className={styles.hint}>{t.s3CredentialsHint}</p>
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

function SftpProvider({
  onChange,
  t,
  value,
}: {
  onChange: (value: Providers["sftp"] | undefined) => void;
  t: T;
  value: Providers["sftp"];
}) {
  return (
    <ProviderCard
      enabled={value !== undefined}
      onToggle={(enabled) =>
        onChange(enabled ? { host: "", path: "" } : undefined)
      }
      title={t.providerSftp}
    >
      <TextField
        label={t.sftpHost}
        onChange={(v) => onChange({ path: "", ...value, host: v })}
        value={value?.host ?? ""}
      />
      <TextField
        label={t.sftpPath}
        onChange={(v) => onChange({ host: "", ...value, path: v })}
        value={value?.path ?? ""}
      />
    </ProviderCard>
  );
}
