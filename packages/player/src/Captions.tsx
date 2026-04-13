import { makeContext } from "@liqvid/utils";

export function Captions() {
  const playback = usePlayback();
  const domElement = useRef<HTMLDivElement>();

  useEffect(() => {
    const updateCaptions = () => {
      domElement.current.innerHTML = "";
      for (const cue of playback.captions) {
        domElement.current.appendChild(cue);
      }
    };

    playback.on("cuechange", updateCaptions);

    return () => {
      playback.off("cuechange", updateCaptions);
    };
  }, [playback]);

  return <div className="lv-captions-display" ref={domElement} />;
}

const { Provider, use } = makeContext<boolean>({
  defaultValue: false,
  name: "Captions",
});

export function CaptionsRoot() {}

export const Captions = {
  Display: CaptionsDisplay,
  Root: CaptionsRoot,
  Toggle: CaptionsToggle,
};
