import { Utils, usePlayer } from "liqvid";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { jsx } from "react/jsx-runtime";

const implementation = function MJX(props, ref) {
  const {
    children,
    async = false,
    display = false,
    resize = false,
    span = false,
    ...attrs
  } = props;
  const spanRef = useRef();
  const [ready, resolve] = usePromise();
  useEffect(() => {
    MathJax.startup.promise.then(() => {
      MathJax.typeset([spanRef.current]);
      resolve();
    });
  }, []);
  useImperativeHandle(ref, () => ({
    get domElement() {
      return spanRef.current;
    },
    ready,
  }));
  const [open, close] = display ? ["\\[", "\\]"] : ["\\(", "\\)"];
  return jsx("span", {
    ...attrs,
    children: open + children + close,
    ref: spanRef,
  });
};
const MJX$1 = forwardRef(implementation);
function usePromise(deps = []) {
  const resolveRef = useRef();
  const promise = useMemo(
    () =>
      new Promise((resolve) => {
        resolveRef.current = resolve;
      }),
    [],
  );
  return [promise, resolveRef.current];
}

const { combineRefs } = Utils.react;
const MJX = forwardRef(function MJX(props, ref) {
  const { reparse = false, ...attrs } = props;
  const plain = useRef();
  const combined = combineRefs(plain, ref);
  const player = usePlayer();
  useEffect(() => {
    if (reparse) {
      plain.current.ready.then(() =>
        player.reparseTree(plain.current.domElement),
      );
    }
  }, []);
  return jsx(MJX$1, { ref: combined, ...attrs });
});

export { MJX };
