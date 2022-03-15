import {ResizeObserver} from "@juggle/resize-observer";
import {useContextBridge} from "@react-three/drei/core/useContextBridge";
import {Canvas as ThreeCanvas, useThree} from "@react-three/fiber";
import {Player, PlaybackContext, KeymapContext} from "liqvid";
import {useEffect} from "react";

/** Default affordances: click and arrow keys */
const defaultAffords = "click keys(ArrowUp,ArrowDown,ArrowLeft,ArrowRight)";

/**
 * Liqvid-aware Canvas component @react-three/fiber
 */
export function Canvas(props: React.ComponentProps<typeof ThreeCanvas & {"data-affords"?: string;}>) {
  const ContextBridge = useContextBridge(Player.Context, PlaybackContext, KeymapContext);
  return (
    <ThreeCanvas resize={{polyfill: ResizeObserver}} {...props}>
      <ContextBridge>
        <Fixes {...props}/>
        {props.children}
      </ContextBridge>
    </ThreeCanvas>
  );
}

function Fixes(props: {
  "data-affords"?: string;
}): null {
  const {gl} = useThree();
  useEffect(() => {
    const affords = props["data-affords"] ?? defaultAffords;
    if (affords) {
      gl.domElement.setAttribute("data-affords", affords);
    }
    gl.domElement.style.touchAction = "none";
  }, []);
  return null;
}
