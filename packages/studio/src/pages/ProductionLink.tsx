"use client";

import { Eye } from "lucide-react";

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
      <Eye size={24} />
    </a>
  );
}
