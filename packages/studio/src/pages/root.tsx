import { serialize } from "@liqvid/ssr";
import { cookies } from "next/headers";

import { COLLAPSED_FOLDERS_COOKIE, FOLDER_VIEW_COOKIE } from "../cookies";
import { getServerState, initializeServer } from "../initialize.mts";

import { NewProjectButton } from "./NewProjectButton";
import { ProjectList } from "./ProjectList";
import { RebuildButton } from "./RebuildButton";

import "../palette.css";

import styles from "./root.module.css";

export async function Homepage() {
  await initializeServer();
  const { productionServerPort, projects } = getServerState();

  const cookieStore = await cookies();
  const folderViewCookie = cookieStore.get(FOLDER_VIEW_COOKIE);
  const initialFolderView = folderViewCookie?.value !== "false";

  const collapsedFoldersCookie = cookieStore.get(COLLAPSED_FOLDERS_COOKIE);
  const initialCollapsedFolders: string[] = collapsedFoldersCookie?.value
    ? JSON.parse(collapsedFoldersCookie.value)
    : [];

  return (
    <main className={styles.main}>
      <div className={styles.headerRow}>
        <h1 className={styles.header}>Projects</h1>
        <NewProjectButton />
        <RebuildButton />
      </div>
      <ProjectList
        initialCollapsedFolders={initialCollapsedFolders}
        initialFolderView={initialFolderView}
        productionServerPort={productionServerPort}
        projects={serialize(projects)}
      />
    </main>
  );
}
