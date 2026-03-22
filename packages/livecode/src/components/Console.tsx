import classNames from "classnames";
import { useStore } from "zustand";

import { useBoothStore } from "../store";

/** Component for displaying console logs. */
export function Console({ className }: { className?: string }) {
  const store = useBoothStore();
  const messages = useStore(store, (state) => state.messages);

  return (
    <section className={classNames("lqv-console", className)}>
      <header>Console</header>
      <output>{messages}</output>
    </section>
  );
}
