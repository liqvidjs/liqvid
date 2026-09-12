"use client";

import {
  PopoverPopup,
  PopoverPortal,
  PopoverPositioner,
  PopoverRoot,
  PopoverTrigger,
} from "#_/ui/Popover.js";

export function DevTranslation({
  children,
  trace,
}: {
  children?: React.ReactNode;
  trace?: unknown;
}) {
  console.log(new Error());
  return (
    <PopoverRoot>
      <PopoverTrigger>{children}</PopoverTrigger>
      <PopoverPortal>
        <PopoverPositioner>
          <PopoverPopup>honk</PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </PopoverRoot>
  );
}
