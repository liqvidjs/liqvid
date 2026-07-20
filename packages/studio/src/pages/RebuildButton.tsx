"use client";

import type { BuildError } from "@liqvid/cli/build";
import { Result } from "@liqvid/fp";
import { deserialize, IS_CLIENT } from "@liqvid/ssr";
import { usePluginApi } from "@liqvid/studio-plugin-api";
import { PackageIcon } from "@phosphor-icons/react";
import { Exit } from "effect";
import { useCallback, useState } from "react";

import { IconButton } from "../ui/IconButton.tsx";

import { rebuildAction } from "./root-actions.ts";

export function RebuildButton() {
  const [isBuilding, setIsBuilding] = useState(false);
  const { makeToast } = usePluginApi();

  const handleRebuild = useCallback(async () => {
    setIsBuilding(true);
    try {
      const exit = await rebuildAction();

      if (Exit.isSuccess(exit)) {
        makeToast({
          title: "Build completed",
          type: "success",
        });
      } else {
        makeToast({
          message: exit.cause.reasons.join("\n"),
          title: "Build failed",
          type: "negative",
        });
      }
    } finally {
      setIsBuilding(false);
    }
  }, [makeToast]);

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
