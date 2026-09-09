import type { Localized } from "#_/i18n/shared.mjs";
import { getTranslations } from "#_/utils/i18n.mjs";

import {
  ProjectListClient,
  type ProjectListProps,
} from "./ProjectList.client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

export async function ProjectList(props: Omit<ProjectListProps, "t">) {
  const t: T = await getTranslations(import.meta.url);
  return <ProjectListClient t={t} {...props} />;
}
