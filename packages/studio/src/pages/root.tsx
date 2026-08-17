import { serialize } from "@liqvid/ssr/serde";
import { cookies } from "next/headers";

import { WebSocketProvider } from "../components/WebSocketProvider.tsx";
import {
  COLLAPSED_FOLDERS_COOKIE,
  FOLDER_VIEW_COOKIE,
  ROOT_PARAMS_COOKIE,
} from "../cookies.ts";
import { getServerState, initializeServer } from "../initialize.mts";

import { NewProjectButton } from "./NewProjectButton/NewProjectButton.tsx";
import { ProjectList } from "./ProjectList/ProjectList.tsx";
import { RebuildButton } from "./RebuildButton/RebuildButton.server.tsx";
import { UpdateBanner } from "./UpdateBanner/UpdateBanner.server.tsx";

import "../studio.css";
import "../palette.css";

import { Option } from "effect";

import {
  type DerivedConfig,
  DerivedConfigProvider,
} from "../components/DerivedConfig.tsx";
import { getTranslations } from "../utils/i18n.mts";

import styles from "./root.module.css";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

export async function Homepage() {
  await initializeServer();
  const {
    basePath,
    config: $config,
    productionServerPort,
    projects,
  } = getServerState();

  if (Option.isNone($config)) {
    throw new Error("config is not initialized");
  }
  const config = $config.value;

  const derivedConfig = {
    hasCaptioningConfigured: Boolean(config.media?.captioning),
    renderSource: {
      screenshots: config.media?.screenshots?.source ?? "preview",
    },
  } satisfies DerivedConfig;

  const t: T = await getTranslations<T>(import.meta.url);

  const cookieStore = await cookies();
  const folderViewCookie = cookieStore.get(FOLDER_VIEW_COOKIE);
  const initialFolderView = folderViewCookie?.value !== "false";

  const collapsedFoldersCookie = cookieStore.get(COLLAPSED_FOLDERS_COOKIE);
  const initialCollapsedFolders: string[] = collapsedFoldersCookie?.value
    ? JSON.parse(collapsedFoldersCookie.value)
    : [];

  // Read selected root parameters from cookie
  const rootParamsCookie = cookieStore.get(ROOT_PARAMS_COOKIE);
  const initialSelectedRootParams: Record<string, string> =
    rootParamsCookie?.value ? JSON.parse(rootParamsCookie.value) : {};

  return (
    <DerivedConfigProvider value={derivedConfig}>
      <WebSocketProvider>
        <main className={styles.main}>
          <UpdateBanner />
          <div className={styles.headerRow}>
            <h1 className={styles.header}>{t.title}</h1>
            <NewProjectButton />
            <RebuildButton />
          </div>
          <ProjectList
            basePath={basePath}
            initialCollapsedFolders={initialCollapsedFolders}
            initialFolderView={initialFolderView}
            initialSelectedRootParams={initialSelectedRootParams}
            productionServerPort={productionServerPort}
            projects={serialize(projects)}
            rootParameters={
              (config.rootParameters ?? {}) as Record<string, string[]>
            }
          />
        </main>
      </WebSocketProvider>
    </DerivedConfigProvider>
  );
}
