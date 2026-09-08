"use client";

import {
  CaretUpDownIcon,
  CheckIcon,
  FloppyDiskIcon,
  SpinnerIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { Effect, Exit } from "effect";
import { useState } from "react";

import type { SettingsConfig } from "#_/api/contract.mjs";
import { clientRuntime, LiqvidStudioApiClient } from "#_/client.mjs";
import { Description } from "#_/design/styles.js";
import {
  breakpoints,
  colors,
  radii,
  spacing,
  text,
} from "#_/design/tokens.stylex.js";
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
import { GitHubPagesProvider } from "./GitHubPagesProvider.tsx";
import { LiqvidStudioProvider } from "./LiqvidStudioProvider.tsx";
import { S3Provider } from "./S3Provider.tsx";
import { SftpProvider } from "./SftpProvider.tsx";

import type TranslationsJson from "../.translations/en.json";

export type T = typeof TranslationsJson;

const settingsSpin = stylex.keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

export const styles = stylex.create({
  check: {
    color: colors.accentSolid,
  },

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

  description: {
    color: colors.grayDim,
    margin: `${spacing.xs} 0 ${spacing.lg}`,
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

  fieldset: {
    borderColor: colors.graySep,
    borderRadius: radii.xl,
    borderStyle: "solid",
    borderWidth: "1px",
    margin: 0,
    padding: spacing.xl,
  },

  hint: {
    color: colors.grayDim,
    fontSize: text.sm,
    margin: `${spacing.md} 0 0`,
  },

  input: {
    background: colors.graySubtle,
    borderColor: colors.graySep,
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: "1px",
    color: colors.grayNormal,
    fontSize: text.base,
    maxWidth: "24rem",
    outline: {
      ":focus-visible": `2px solid ${colors.accentSolid}`,
      default: null,
    },
    outlineOffset: {
      ":focus-visible": "1px",
      default: null,
    },
    padding: `${spacing.md} ${spacing.lg}`,
    width: "100%",
  },

  itemSelected: {
    background: "var(--accent-ui)",
  },

  legend: {
    fontSize: text.base,
    fontWeight: "bold",
    padding: `0 ${spacing.md}`,
  },
  main: {
    fontSize: text.base,
    marginBlock: "0",
    marginInline: "auto",
    padding: "8px",
    width: {
      default: null,
      [breakpoints.desktop]: "48rem",
    },
  },

  name: {
    flex: "1",
  },

  optionLabel: {
    alignItems: "center",
    display: "flex",
    gap: spacing.lg,
  },

  popup: {
    background: colors.grayApp,
    borderColor: colors.graySep,
    borderRadius: radii.xl,
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: "0 8px 24px light-dark(#00000026, #00000066)",
    display: "flex",
    flexDirection: "column",
    gap: spacing.lg,
    minWidth: "var(--anchor-width, 20rem)",
    padding: spacing.xs,
  },

  positioner: {
    zIndex: 30,
  },

  providerCard: {
    background: colors.graySubtle,
    borderColor: colors.graySep,
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: "1px",
    marginTop: spacing.lg,
    padding: spacing.lg,
  },

  providerFields: {
    borderTopColor: colors.graySep,
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },

  providerTitle: {
    fontWeight: "bold",
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
    color: "#fff",
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

  spinner: {
    animationDuration: "0.8s",
    animationIterationCount: "infinite",
    animationName: settingsSpin,
    animationTimingFunction: "linear",
    color: colors.grayDim,
    flexShrink: 0,
  },

  trigger: {
    alignItems: "center",
    background: {
      ":hover:not([data-disabled])": colors.grayHover,
      default: colors.graySubtle,
    },
    borderColor: {
      ":hover:not([data-disabled])": colors.graySep,
      default: colors.graySep,
    },
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: "1px",
    color: colors.grayNormal,
    cursor: {
      ":disabled": "default",
      default: "pointer",
    },
    display: "flex",
    fontSize: text.base,
    gap: spacing.lg,
    justifyContent: "space-between",
    maxWidth: "20rem",
    opacity: {
      default: null,
    },
    outline: {
      ":focus-visible": `2px solid ${colors.accentSolid}`,
      default: null,
    },
    outlineOffset: {
      ":focus-visible": "1px",
      default: null,
    },
    padding: `${spacing.md} ${spacing.lg}`,
    textAlign: "left",
    transition: "background-color 0.15s, border-color 0.15s",
    width: "100%",
  },

  triggerDisabled: {
    cursor: "default",
    opacity: 0.6,
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
      {...stylex.props(styles.configForm)}
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
    >
      {/* ---------------------------- backend ---------------------------- */}
      <FieldSet>
        <Legend>{t.backend}</Legend>
        <Description>{t.backendDescription}</Description>

        <div {...stylex.props(styles.field)}>
          <span {...stylex.props(styles.fieldLabel)}>{t.contentBackend}</span>
          <ProviderSelect
            emptyLabel={t.notConfigured}
            onValueChange={(v) => setBackend("content", v)}
            options={CONTENT_PROVIDERS}
            value={contentBackend}
          />
        </div>

        <div {...stylex.props(styles.field)}>
          <span {...stylex.props(styles.fieldLabel)}>{t.mediaBackend}</span>
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
        <Description>{t.basePathDescription}</Description>

        <input
          {...stylex.props(styles.input)}
          onChange={(e) =>
            patch({
              basePath: e.target.value === "" ? undefined : e.target.value,
            })
          }
          placeholder="/my-project"
          type="text"
          value={draft.basePath ?? ""}
        />
      </FieldSet>

      {/* ----------------------------- media ----------------------------- */}
      <FieldSet>
        <Legend>{t.media}</Legend>
        <Description>{t.mediaDescription}</Description>

        <label {...stylex.props(styles.checkboxField)}>
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

      {saveError && (
        <p {...stylex.props(styles.error)}>{`${t.saveError}: ${saveError}`}</p>
      )}

      <Button
        {...stylex.props(styles.saveButton)}
        disabled={saving}
        type="submit"
      >
        {saving ? (
          <SpinnerIcon {...stylex.props(styles.spinner)} weight="bold" />
        ) : (
          <FloppyDiskIcon weight="bold" />
        )}
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
    <SelectRoot
      items={items}
      onValueChange={(v) => onValueChange(v as string)}
      value={value}
    >
      <SelectTrigger {...stylex.props(styles.trigger)}>
        <SelectValue>{(v: string) => items[v] ?? emptyLabel}</SelectValue>
        <SelectIcon>
          <CaretUpDownIcon />
        </SelectIcon>
      </SelectTrigger>

      <SelectPortal>
        <SelectPositioner
          alignItemWithTrigger={false}
          {...stylex.props(styles.positioner)}
          sideOffset={4}
        >
          <SelectPopup {...stylex.props(styles.popup)}>
            {Object.entries(items).map(([code, label]) => (
              <SelectItem key={code} value={code}>
                <SelectItemText {...stylex.props(styles.name)}>
                  {label}
                </SelectItemText>
                <SelectItemIndicator {...stylex.props(styles.check)}>
                  <CheckIcon weight="bold" />
                </SelectItemIndicator>
              </SelectItem>
            ))}
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </SelectRoot>
  );
}

export type Providers = NonNullable<SettingsConfig["providers"]>;
