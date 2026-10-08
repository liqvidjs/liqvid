"use client";

import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  PlainString,
} from "@liqvid/studio/ui";

import styles from "./studio-plugin.module.css";

export function TranscriptDialog({ transcript }: { transcript: string }) {
  return (
    <DialogPortal>
      <DialogBackdrop forceRender />
      <DialogPopup size="large">
        <DialogTitle>{PlainString("Transcript")}</DialogTitle>
        <blockquote className={styles.transcript}>{transcript}</blockquote>
        <DialogClose />
      </DialogPopup>
    </DialogPortal>
  );
}
