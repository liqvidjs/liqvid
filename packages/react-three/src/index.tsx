import {ResizeObserver} from "@juggle/resize-observer";
import {KeymapContext} from "@liqvid/keymap/react";
import {PlaybackContext} from "@liqvid/playback/react";
import {useContextBridge} from "@react-three/drei/core/useContextBridge";
import {Canvas as ThreeCanvas, useThree} from "@react-three/fiber";
import {Player} from "liqvid";
import {useEffect} from "react";

/**
 * Liqvid-aware Canvas component @react-three/fiber
 */
export function Canvas(props: React.ComponentProps<typeof ThreeCanvas>) {
  const ContextBridge = useContextBridge(Player.Context, PlaybackContext, KeymapContext);
  return (
    <ThreeCanvas resize={{polyfill: ResizeObserver}} {...props}>
      <ContextBridge>
        <Fixes/>
        {props.children}
      </ContextBridge>
    </ThreeCanvas>
  );
}

function Fixes(): null {
  const {gl} = useThree();
  useEffect(() => {
    gl.domElement.setAttribute("touch-action", "none");
    gl.domElement.addEventListener("mouseup", Player.preventCanvasClick);
  }, []);
  return null;
}
