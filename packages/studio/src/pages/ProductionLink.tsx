"use client";

import { EyeIcon } from "@phosphor-icons/react";

import styles from "./root.module.css";

export function ProductionLink({ href }: { href: string }) {
  return (
    <a
      className={styles.productionLink}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      title="Preview"
    >
      <EyeIcon size={24} />
    </a>
  );
}
