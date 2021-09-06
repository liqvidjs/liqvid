import {Canvas, useThree} from "@react-three/fiber";
import {ResizeObserver} from '@juggle/resize-observer';
import {Player, usePlayer} from "liqvid";

export function ThreeCanvas(props: React.ComponentProps<typeof Canvas>) {
  return (
    <Canvas resize={{polyfill: ResizeObserver}} {...props}>
      <Player.Context.Provider value={usePlayer()}>
        <Fixes/>
        {props.children}
      </Player.Context.Provider>
    </Canvas>
  );
}

import {useEffect} from "react";

function Fixes(): null {
  const {gl} = useThree();
  useEffect(() => {
    gl.domElement.setAttribute("touch-action", "none");
    gl.domElement.addEventListener("mouseup", Player.preventCanvasClick);
  }, []);
  return null;
}
