"use client";

import { fonts } from "#_/design/styles.js";
import { interpolated, type Localized, PlainString } from "#_/i18n/shared.mjs";
import { EnvVarInput } from "#_/pages/settings/PublishingConfig/EnvVarInput.js";
import { FieldSet, Legend } from "#_/ui/Fieldset.js";

import { usePublishingConfigClient } from "../client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

export function BasePathConfigClient({ t }: { t: T }) {
  const $t = interpolated(t);
  const { draft, patch } = usePublishingConfigClient();

  return (
    <FieldSet>
      <Legend>{t.title}</Legend>
      <p sx={fonts.description}>
        {$t.description({
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
  );
}
