import { serialize } from "@liqvid/ssr";
import { cookies } from "next/headers";

import { WebSocketProvider } from "../components/WebSocketProvider.tsx";
import { COLLAPSED_FOLDERS_COOKIE, FOLDER_VIEW_COOKIE } from "../cookies.ts";
import { getServerState, initializeServer } from "../initialize.mts";

import { NewProjectButton } from "./NewProjectButton.tsx";
import { ProjectList } from "./ProjectList/ProjectList.tsx";
import { RebuildButton } from "./RebuildButton.tsx";

import "../palette.css";

import { getTranslations } from "../utils/i18n.mts";

import styles from "./root.module.css";

import type T from "./.translations/en.json";

type T = typeof T;

export async function Homepage() {
  await initializeServer();
  const { basePath, productionServerPort, projects } = getServerState();

  const t: T = await getTranslations<T>(import.meta.url);

  const cookieStore = await cookies();
  const folderViewCookie = cookieStore.get(FOLDER_VIEW_COOKIE);
  const initialFolderView = folderViewCookie?.value !== "false";

  const collapsedFoldersCookie = cookieStore.get(COLLAPSED_FOLDERS_COOKIE);
  const initialCollapsedFolders: string[] = collapsedFoldersCookie?.value
    ? JSON.parse(collapsedFoldersCookie.value)
    : [];

  return (
    <WebSocketProvider>
      <main className={styles.main}>
        <div className={styles.headerRow}>
          <h1 className={styles.header}>{t.title}</h1>
          <NewProjectButton t={t} />
          <RebuildButton />
        </div>
        <ProjectList
          basePath={basePath}
          initialCollapsedFolders={initialCollapsedFolders}
          initialFolderView={initialFolderView}
          productionServerPort={productionServerPort}
          projects={serialize(projects)}
        />
      </main>
    </WebSocketProvider>
  );
}
