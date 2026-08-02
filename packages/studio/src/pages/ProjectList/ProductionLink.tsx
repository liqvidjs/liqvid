"use client";

import { EyeIcon } from "@phosphor-icons/react";

import { useTranslations } from "../../utils/react.tsx";

import styles from "./share.module.css";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

export function PreviewButton({ href }: { href: string }) {
  const t = useTranslations<T>();

  return (
    <a
      className={styles.productionLink}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      title={t.preview}
    >
      <EyeIcon size={24} />
    </a>
  );
}
