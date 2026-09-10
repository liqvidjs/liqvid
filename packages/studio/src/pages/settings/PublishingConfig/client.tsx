"use client";

import { makeContext } from "@liqvid/utils";
import { FloppyDiskIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { Effect, Exit } from "effect";
import { useState } from "react";

import type { SettingsConfig } from "#_/api/contract.mjs";
import { clientRuntime, LiqvidStudioApiClient } from "#_/client.mjs";
import { Spinner } from "#_/components/Spinner.js";
import { colors, spacing, text } from "#_/design/tokens.stylex.js";
import type { Localized } from "#_/i18n/shared.mjs";
import { Button } from "#_/ui/Button.js";

import type TranslationsJson from "./.translations/en.json";

export type T = Localized<typeof TranslationsJson>;

const styles = stylex.create({

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
  save: {
    marginLeft: "auto",
  },
});

const { use: usePublishingConfigClient, Provider: PublishingConfigProvider } =
  makeContext<{
    draft: SettingsConfig;
    patch: (next: Partial<SettingsConfig>) => void;
  }>({
    defaultValue: {
      get draft(): SettingsConfig {
        throw new Error(
          "usePublishingConfigClient must be used within a PublishingConfigProvider",
        );
      },
      patch: () => {},
    },
    name: "PublishingContent",
  });

export { usePublishingConfigClient };

/**
 * @package
 * Editor for the `backend`, `basePath`, `media`, and `providers` fields of
 * `liqvid.json`.
 */
export function PublishingConfigClient({
  children,
  config,
  t,
}: {
  children?: React.ReactNode;
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

  const [draft, setDraft] = useState<SettingsConfig>(config);

  function patch(next: Partial<SettingsConfig>) {
    setDraft((d) => ({ ...d, ...next }));
  }

  return (
    <PublishingConfigProvider value={{ draft, patch }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(draft);
        }}
        sx={styles.configForm}
      >
        {children}

        {saveError && <p sx={styles.error}>{`${t.saveError}: ${saveError}`}</p>}

        <Button
          disabled={saving}
          kind="primary"
          style={styles.save}
          type="submit"
        >
          {saving ? <Spinner /> : <FloppyDiskIcon weight="fill" />}
          {t.save}
        </Button>
      </form>
    </PublishingConfigProvider>
  );
}

export type Providers = NonNullable<SettingsConfig["providers"]>;
