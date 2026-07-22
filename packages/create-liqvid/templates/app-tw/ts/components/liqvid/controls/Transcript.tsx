import { Dialog } from "@base-ui/react";
import type { RichTranscript } from "@liqvid/schemas";
import { type Awaitable, formatTime } from "@liqvid/utils";
import { XIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import { Controls, useColorScheme } from "liqvid";

/** Rich transcript display */
export function Transcript({
  transcript,
  ...props
}: {
  transcript: Awaitable<RichTranscript>;
} & React.ComponentProps<typeof Dialog.Root>) {
  const { colorScheme } = useColorScheme();

  return (
    <Dialog.Root {...props}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Popup
          className={clsx(
            "fixed top-1/2 left-1/2 z-2000 h-[50vh] w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-md",
            "border border-gray-500 border-solid bg-gray-100 p-2 shadow-sm",
            "dark:bg-stone-800 dark:text-white",
          )}
          data-color-scheme={colorScheme}
          style={{ colorScheme }}
        >
          <Controls.Transcript.Root transcript={transcript}>
            <div className="flex">
              <Controls.Transcript.Search
                className={clsx(
                  "inset-ring-2 inset-ring-black/5 rounded-xs px-1",
                  "dark:inset-ring-stone-900/5 dark:bg-stone-700",
                )}
                placeholder="Search transcript"
              />
              <Dialog.Close className="ml-auto cursor-pointer">
                <XIcon />
              </Dialog.Close>
            </div>
            <div className="mt-2 max-h-80 overflow-auto">
              <div className="flex items-stretch">
                <Controls.Transcript.Times
                  className="relative w-12 text-sm"
                  interval={{ seconds: 20 }}
                  renderLink={(time, props) => (
                    <button
                      className={clsx(
                        "absolute right-2 cursor-pointer text-right text-gray-400 hover:text-gray-500",
                        "dark:text-stone-600 dark:hover:text-stone-500",
                      )}
                      title={`Jump to ${formatTime(time)}`}
                      {...props}
                    />
                  )}
                />
                <div className="scrollbar-thin flex-1">
                  <Controls.Transcript.Body
                    className={clsx(
                      "lv-transcript-lines", // notebook effect
                      "inset-ring-2 inset-ring-black/5 cursor-pointer rounded-xs border border-gray-300 border-solid px-2",
                      "dark:inset-ring-stone-900/5 dark:border-stone-700",
                      "has-[mark]:text-gray-400 dark:has-[mark]:text-stone-600",
                    )}
                    renderWord={(_, props) => (
                      <a
                        className={clsx(
                          "lv-transcript-active-word", // background effect
                          "hover:text-(--lv-accent)",
                          "[&>mark]:bg-transparent [&>mark]:text-black dark:[&>mark]:text-white",
                        )}
                        {...props}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          </Controls.Transcript.Root>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
