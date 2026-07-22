import { useFirstRender } from "@liqvid/utils";
import clsx from "clsx";
import { usePlayer } from "liqvid";
import { useMemo } from "react";

export function LoadingScreen() {
  const { renderingTasks } = usePlayer();

  const isFirstRender = useFirstRender();

  const visibleRenderingTasks = useMemo(
    () => Array.from(renderingTasks).filter((task) => task.visible),
    [renderingTasks],
  );

  if (visibleRenderingTasks.length === 0 && !isFirstRender) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 z-100 flex h-screen w-screen items-center bg-black/60 text-white">
      <div
        className={clsx(
          "mx-auto h-[20vmin] w-[20vmin] animate-spin rounded-full",
          "border-[2rem] border-gray-300 border-t-(--wine)",
          "dark:border-gray-600 dark:border-t-(--wine)",
        )}
      />
    </div>
  );
}
