import { getTranslations } from "../../utils/i18n.mts";

import {
  ProjectListClient,
  type ProjectListProps,
} from "./ProjectList.client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

export async function ProjectList(props: Omit<ProjectListProps, "t">) {
  const t: T = await getTranslations(import.meta.url);
  return <ProjectListClient t={t} {...props} />;
}
