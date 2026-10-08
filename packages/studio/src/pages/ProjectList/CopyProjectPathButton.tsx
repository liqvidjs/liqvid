"use client";

import { useProjectPath } from "@liqvid/studio-plugin-api";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { useLiqvidConfig } from "#_/contexts/liqvid-config";
import type { Localized } from "#_/i18n/shared";
import { MenuItem } from "#_/ui/Menu";
import { useTranslations } from "#_/utils/react";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

const COPIED_FEEDBACK_MS = 1500;

/**
 * Single-quote for POSIX shells so `cd <paste>` works with spaces and
 * `[param]` segments.
 */
function shellSingleQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

export function CopyProjectPathButton() {
  const projectPath = useProjectPath();
  const { routesDir } = useLiqvidConfig();
  const t = useTranslations<T>();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function handleClick() {
    // Filesystem directory, not the interpolated URL. Quote so `cd <paste>`
    // works when the directory name contains spaces or `[param]` segments.
    const fullPath = shellSingleQuote(`${routesDir}/${projectPath}`);
    try {
      await navigator.clipboard.writeText(fullPath);
    } catch (error) {
      console.error("Failed to copy project path:", error);
      return;
    }
    setCopied(true);
  }

  return (
    <MenuItem onClick={handleClick}>
      {copied ? <CheckIcon size={24} /> : <CopyIcon size={24} />}
      {copied ? t.copiedProjectPath : t.copyProjectPath}
    </MenuItem>
  );
}
