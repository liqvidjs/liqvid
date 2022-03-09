import {usePlayer} from "liqvid";
import {forwardRef, useEffect, useMemo, useRef} from "react";
import {KTXNonBlocking} from "./NonBlocking";

// blocking version
export const KTXBlocking = forwardRef<Handle, Props>(function KTX(props, ref) {
  const player = usePlayer();
  const innerRef = useRef<React.ElementRef<typeof KTXNonBlocking>>();
  if (typeof ref === "function") {
    ref(innerRef.current);
  } else if (ref) {
    ref.current = innerRef.current;
  }

  /* obstruction nonsense */
  const resolve = useRef(null);
  useMemo(() => {
    const promise = new Promise((res) => {
      resolve.current = res;
    });
    player.obstruct("canplay", promise);
    player.obstruct("canplaythrough", promise);
  }, []);

  useEffect(() => {
    if (typeof ref === "function") {
      ref(innerRef.current);
    } else if (ref) {
      ref.current = innerRef.current;
    }
    innerRef.current.ready.then(() => resolve.current());
  }, []);

  return (<KTXNonBlocking ref={innerRef} {...props}/>);
});
