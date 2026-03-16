"use client";

import { useCallback, useState } from "react";

import { rebuildAction } from "./root-actions";

import styles from "./root.module.css";

export function RebuildButton() {
  const [isBuilding, setIsBuilding] = useState(false);

  const handleRebuild = useCallback(async () => {
    setIsBuilding(true);
    try {
      const result = await rebuildAction();
      if (result.success) {
        // Optionally show success feedback
      } else {
        console.error("Build failed");
      }
    } finally {
      setIsBuilding(false);
    }
  }, []);

  return (
    <button
      className={styles.rebuildButton}
      disabled={isBuilding}
      onClick={handleRebuild}
      title="Rebuild projects for production"
      type="button"
    >
      {isBuilding ? "🔨 Building..." : "📦 Rebuild"}
    </button>
  );
}
