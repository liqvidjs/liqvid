import {ResizeObserver} from "@juggle/resize-observer";
import {useContextBridge} from "@react-three/drei/core/useContextBridge";
import {Canvas as ThreeCanvas, useThree} from "@react-three/fiber";
import {Player, PlaybackContext, KeymapContext} from "liqvid";
import {useEffect} from "react";

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
    if ("data-affords" in props) {
      gl.domElement.setAttribute("data-affords", props["data-affords"]);
    }
    gl.domElement.setAttribute("touch-action", "none");
  }, []);
  return null;
}
