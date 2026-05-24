"use client";

import { Root as $Portal, type PortalProps } from "@radix-ui/react-portal";
import { useEffect, useState } from "react";

/** React Portal; does not mount on first render in order to avoid hydration/context issues */
export function Portal(props: PortalProps) {
  const [render, setRender] = useState(false);

  useEffect(() => {
    setRender(true);
  }, []);

  if (!render) return null;

  return <$Portal {...props} />;
}
