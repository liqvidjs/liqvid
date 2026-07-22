import { Suspense } from "react";

/** Call a hook inside a Suspense boundary */
export function SuspenseHook({ hook }: { hook: () => void }) {
  return (
    <Suspense fallback={null}>
      <SuspenseHookInner useHook={hook} />
    </Suspense>
  );
}

function SuspenseHookInner({ useHook }: { useHook: () => void }) {
  useHook();
  return null;
}
