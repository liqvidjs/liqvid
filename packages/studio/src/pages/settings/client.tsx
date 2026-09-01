"use client";

// biome-ignore lint/style/noRestrictedImports: no styled wrapper exists yet
import { Select } from "@base-ui/react/select";
import type { Locale } from "@liqvid/schemas";
import {
  CaretUpDownIcon,
  CheckIcon,
  GearIcon,
  SpinnerIcon,
  TranslateIcon,
} from "@phosphor-icons/react";
import { Effect, Exit } from "effect";
import { useState } from "react";

import type { SettingsConfig } from "#_/api/contract.mjs";
import { clientRuntime, LiqvidStudioApiClient } from "#_/client.mjs";

import { ConfigClient } from "./ConfigClient.tsx";

import styles from "./settings.module.css";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

/**
 * Supported UI locales, shown with their native names and a Unicode flag.
 * Names are intentionally left untranslated (displayed in their own language).
 */
const LOCALES: { code: Locale; flag: string; name: string }[] = [
  { code: "en", flag: "\u{1F1EC}\u{1F1E7}", name: "English" },
  { code: "fr", flag: "\u{1F1EB}\u{1F1F7}", name: "Français" },
  { code: "es", flag: "\u{1F1EA}\u{1F1F8}", name: "Español" },
  { code: "de", flag: "\u{1F1E9}\u{1F1EA}", name: "Deutsch" },
  { code: "zh", flag: "\u{1F1E8}\u{1F1F3}", name: "中文" },
];

/** Item map for `<Select.Root items>` (value → label). */
const LOCALES_ITEMS: Record<string, string> = Object.fromEntries(
  LOCALES.map(({ code, name }) => [code, name]),
);

export function SettingsClient({
  config,
  locale: initialLocale,
  t,
}: {
  config: SettingsConfig;
  locale: Locale;
  t: T;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [saving, setSaving] = useState<Locale | null>(null);

  async function selectLocale(next: Locale) {
    if (next === locale || saving) return;

    setSaving(next);

    const result = await clientRuntime.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;
        return yield* client.settings.setLocale({
          payload: { locale: next },
        });
      }),
    );

    setSaving(null);

    if (Exit.isSuccess(result)) {
      setLocale(result.value.locale);
      // Reload so server-rendered translations reflect the new locale.
      window.location.reload();
    } else {
      console.error("Failed to update locale:", result.cause);
    }
  }

  return (
    <main className={styles.main}>
      <h1>{t.title}</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <TranslateIcon weight="bold" />
          {t.language}
        </h2>
        <p className={styles.description}>{t.languageDescription}</p>

        <Select.Root
          disabled={saving !== null}
          items={LOCALES_ITEMS}
          onValueChange={(value) => selectLocale(value as Locale)}
          value={locale}
        >
          <Select.Trigger className={styles.trigger}>
            <Select.Value>
              {(value: Locale) => {
                const selected = LOCALES.find((l) => l.code === value);
                return selected ? (
                  <span className={styles.optionLabel}>
                    <span aria-hidden className={styles.flag}>
                      {selected.flag}
                    </span>
                    {selected.name}
                  </span>
                ) : null;
              }}
            </Select.Value>
            {saving !== null ? (
              <SpinnerIcon className={styles.spinner} weight="bold" />
            ) : (
              <Select.Icon>
                <CaretUpDownIcon />
              </Select.Icon>
            )}
          </Select.Trigger>

          <Select.Portal>
            <Select.Positioner
              alignItemWithTrigger={false}
              className={styles.positioner}
              sideOffset={4}
            >
              <Select.Popup className={styles.popup}>
                {LOCALES.map(({ code, flag, name }) => (
                  <Select.Item className={styles.item} key={code} value={code}>
                    <span aria-hidden className={styles.flag}>
                      {flag}
                    </span>
                    <Select.ItemText className={styles.name}>
                      {name}
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
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <GearIcon weight="bold" />
          {t.configuration}
        </h2>
        <p className={styles.description}>{t.configurationDescription}</p>

        <ConfigClient config={config} t={t} />
      </section>
    </main>
  );
}
