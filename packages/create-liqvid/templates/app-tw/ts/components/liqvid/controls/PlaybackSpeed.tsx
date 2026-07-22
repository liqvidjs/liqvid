import { Menu, Slider } from "@base-ui/react";
import { SpeedometerIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import { useEventListener, usePlayback, usePlayer } from "liqvid";
import { useState } from "react";

import { detailClassName } from "../controls.tsx";

/** Playback speed presets */
const SPEED_PRESETS = [0.5, 1, 1.5, 2, 3];

/** Submenu to set the playback speed */
export function PlaybackSpeed({ buttonClass }: { buttonClass: string }) {
  const playback = usePlayback();
  const [rate, setRate] = useState(playback.playbackRate);

  // keep local state in sync with playback rate changes
  useEventListener(playback, "ratechange", () => {
    setRate(playback.playbackRate);
  });

  const setRateValue = (value: number) => {
    playback.playbackRate = value;
  };

  const label = rate === 1 ? "Normal" : `${rate.toFixed(2)}`;

  const player = usePlayer();

  return (
    <Menu.SubmenuRoot
      onOpenChange={(isOpen) => {
        player.domElement?.classList.toggle("speed-open", isOpen);
      }}
    >
      <Menu.SubmenuTrigger className={buttonClass}>
        <SpeedometerIcon />
        Speed
        <span className={detailClassName}>{label}</span>
      </Menu.SubmenuTrigger>
      <Menu.Portal keepMounted>
        <Menu.Positioner
          align="end"
          className="z-50"
          side="left"
          sideOffset={8}
        >
          <Menu.Popup className="relative block w-50 overflow-hidden rounded-sm bg-black/85 p-3 text-white">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Playback speed</span>
              <span className="text-white/50">{label}</span>
            </div>

            {/* slider */}
            <Slider.Root
              max={3.0}
              min={0.25}
              onValueChange={(value) => setRateValue(value as number)}
              step={0.05}
              value={rate}
            >
              <Slider.Control className="flex h-4 w-full touch-none items-center">
                <Slider.Track className="h-1 w-full rounded-full bg-white/25">
                  <Slider.Indicator className="rounded-full bg-white" />
                  <Slider.Thumb className="size-3 rounded-full bg-white" />
                </Slider.Track>
              </Slider.Control>
            </Slider.Root>

            {/* presets */}
            <div className="mt-3 flex flex-wrap gap-1">
              {SPEED_PRESETS.map((preset) => (
                <button
                  className={clsx(
                    "flex-1 cursor-pointer rounded-xs px-1 py-0.5 text-xs",
                    rate === preset
                      ? "bg-white text-black"
                      : "bg-white/10 hover:bg-white/20",
                  )}
                  key={preset}
                  onClick={() => setRateValue(preset)}
                  type="button"
                >
                  {preset.toFixed(2)}
                </button>
              ))}
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}
