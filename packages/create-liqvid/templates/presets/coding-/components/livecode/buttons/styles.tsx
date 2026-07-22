import clsx from "clsx";

import styles from "../livecode.module.css";

export const buttonStyles = clsx(
  styles.button,
  "flex h-6 cursor-pointer items-center gap-1 rounded-sm border-none p-1 text-gray-500 text-xs",
  "disabled:cursor-default",
  "hover:brightness-100 dark:bg-(--surface) dark:active:text-white dark:hover:text-gray-200",
);
