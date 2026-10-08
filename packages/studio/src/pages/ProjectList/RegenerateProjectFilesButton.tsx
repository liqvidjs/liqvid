"use client";

import { useProjectPath } from "@liqvid/studio-plugin-api";
import { ArrowClockwiseIcon, CheckIcon } from "@phosphor-icons/react";
import { Exit } from "effect";
import { useState } from "react";

import { regenerateProjectFiles } from "#_/client";
import { MenuItem } from "#_/ui/Menu";
import { Spinner } from "#_/ui/Spinner.js";
import { useTranslations } from "#_/utils/react";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

export function RegenerateProjectFilesButton() {
  const projectPath = useProjectPath();
  const t = useTranslations<T>();
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");

  async function regenerate() {
    if (status === "running") return;
    setStatus("running");

    const result = await regenerateProjectFiles(projectPath);

    if (Exit.isSuccess(result)) {
      console.debug("Regenerated project files:", result.value);
      setStatus("done");
    } else {
      console.error("Failed to regenerate project files:", result.cause);
      setStatus("idle");
    }
  }

  const label =
    status === "done" ? t.projectFilesRegenerated : t.regenerateProjectFiles;

  return (
    <MenuItem disabled={status === "running"} onClick={regenerate}>
      {status === "running" ? (
        <Spinner size={24} />
      ) : status === "done" ? (
        <CheckIcon size={24} />
      ) : (
        <ArrowClockwiseIcon size={24} />
      )}
      {label}
    </MenuItem>
  );
}
