"use client";

import { Package } from "lucide-react";
import { useCallback, useState } from "react";

import { IconButton } from "../ui/IconButton";

import { rebuildAction } from "./root-actions";

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
      <Package />
    </IconButton>
  );
}
