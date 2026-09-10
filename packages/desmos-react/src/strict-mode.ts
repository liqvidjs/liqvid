import { useEffect, useRef } from "react";

export function useIsStrictMode() {
  const hasRun = useRef(false);

  useEffect(() => {
    return () => {
      // Mark as run when Strict Mode does its initial unmount
      hasRun.current = true;
    };
  }, []);

  return hasRun;
}
