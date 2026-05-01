"use client";

import { PackageIcon } from "@phosphor-icons/react";
import { useCallback, useState } from "react";

import { IconButton } from "../ui/IconButton.tsx";

import { rebuildAction } from "./root-actions.ts";

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
    <IconButton
      disabled={isBuilding}
      onClick={handleRebuild}
      title={isBuilding ? "Building..." : "Rebuild projects for production"}
    >
      <PackageIcon />
    </IconButton>
  );
}
