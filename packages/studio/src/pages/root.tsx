import { formatTime, formatTimeDuration } from "@liqvid/utils";
import { Eye } from "lucide-react";

import { getServerState, initializeServer } from "../initialize.mts";
import type { ProjectMeta } from "../schemas/project.mts";

import { NewProjectButton } from "./NewProjectButton";
import { RebuildButton } from "./RebuildButton";

import "../palette.css";

import { serialize } from "@liqvid/ssr";

import styles from "./root.module.css";

export async function Homepage() {
  await initializeServer();
  const { productionServerPort, projects } = getServerState();

  return (
    <main className={styles.main}>
      <div className={styles.headerRow}>
        <h1 className={styles.header}>Projects</h1>
        <NewProjectButton />
        <RebuildButton />
      </div>
      <ProjectList
        productionServerPort={productionServerPort}
        projects={serialize(projects)}
      />
    </main>
  );
}

function Thumbnail({ aspectRatio, duration, path, openGraph }: ProjectMeta) {
  return (
    <div
      className={styles.thumbnail}
      style={{
        aspectRatio: `${aspectRatio.width} / ${aspectRatio.height}`,
        backgroundSize: "100% 100%",
        ...(openGraph
          ? {
              backgroundImage: `url("/${path}/opengraph-image.png")`,
            }
          : {}),
      }}
    >
      {duration && (
        <time
          className={styles.duration}
          dateTime={formatTimeDuration(duration)}
        >
          {formatTime(duration)}
        </time>
      )}
    </div>
  );
}
