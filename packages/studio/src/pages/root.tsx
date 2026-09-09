import { serialize } from "@liqvid/ssr/serde";
import { GearIcon } from "@phosphor-icons/react/dist/ssr";
import * as stylex from "@stylexjs/stylex";
import { Option } from "effect";
import { cookies } from "next/headers";
import Link from "next/link";

import {
  type DerivedConfig,
  DerivedConfigProvider,
} from "#_/components/DerivedConfig.js";
import { WebSocketProvider } from "#_/components/WebSocketProvider.js";
import {
  COLLAPSED_FOLDERS_COOKIE,
  FOLDER_VIEW_COOKIE,
  ROOT_PARAMS_COOKIE,
} from "#_/cookies.js";
import { breakpoints, spacing, text } from "#_/design/tokens.stylex.js";
import type { Localized } from "#_/i18n/shared.mjs";
import { getServerState, initializeServer } from "#_/initialize.mjs";
import { getTranslations } from "#_/utils/i18n.mjs";

import { NewProjectButton } from "./NewProjectButton/server.tsx";
import { ProjectList } from "./ProjectList/ProjectList.tsx";
import { RebuildButton } from "./RebuildButton/server.tsx";
import { UpdateBanner } from "./UpdateBanner/UpdateBanner.server.tsx";

import "../stylex.css";

import type TranslationsJson from "./.translations/en.json";

const styles = stylex.create({
  header: {
    fontSize: {
      [breakpoints.desktop]: text.mega,
      default: text.lg,
    },
    fontWeight: "bold",
  },
  headerRow: {
    alignItems: "center",
    columnGap: "1rem",
    display: "flex",
    marginBottom: "1rem",
    rowGap: "1rem",
  },
  main: {
    fontSize: text.base,
    marginBlock: spacing.zero,
    marginInline: spacing.auto,
    padding: `${spacing.control} 0`,
    width: {
      [breakpoints.desktop]: "48rem",
      default: null,
    },
  },

  settingsLink: {
    marginLeft: "auto",
  },
});

type T = Localized<typeof TranslationsJson>;

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
        <main sx={styles.main}>
          <UpdateBanner />
          <div sx={styles.headerRow}>
            <h1 sx={styles.header}>{t.title}</h1>
            <NewProjectButton />
            <RebuildButton />
            <Link
              href="./settings"
              title={t.settings}
              {...stylex.props(styles.settingsLink)}
            >
              <GearIcon size={32} weight="fill" />
            </Link>
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
