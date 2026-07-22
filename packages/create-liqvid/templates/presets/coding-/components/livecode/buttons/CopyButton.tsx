import { useCopyActiveFile } from "@lqv/livecode";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import clsx from "clsx";

import { buttonStyles } from "./styles.tsx";

import copyStyles from "./copy-styles.module.css";

export function CopyButton() {
  const { copyActiveFile, isCopied } = useCopyActiveFile();

  return (
    <button
      aria-label={isCopied ? "Copied" : "Copy code to clipboard"}
      className={clsx(
        buttonStyles,
        "h-full",
        isCopied && copyStyles.copyButtonCopied,
      )}
      onClick={copyActiveFile}
      title="Copy"
      type="button"
    >
      <span aria-hidden="true" className={copyStyles.copyButtonIcons}>
        <CopyIcon className={copyStyles.copyButtonIcon} />
        <CheckIcon className={copyStyles.copyButtonSuccessIcon} color="green" />
      </span>
    </button>
  );
}
