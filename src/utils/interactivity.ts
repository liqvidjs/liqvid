import Player from '../Player';

export function dragHelper<T extends Node>(
  mousemove: (e: MouseEvent, dx: number, dy: number) => void,
  mousedown: (
              e: MouseEvent | React.MouseEvent<T>,
              mouseUpHandler: (e: MouseEvent) => void,
              mousemoveHandler: (e: MouseEvent) => void
             ) => void = (e) => {},
  mouseup: (e: MouseEvent) => void = (e) => {}
) {
  return (e: MouseEvent | React.MouseEvent<T>) => {
    if (e.button !== 0) return;

    let lastX = e.clientX,
        lastY = e.clientY;

    document.body.addEventListener('mousemove', mousemoveHandler);
    window.addEventListener('mouseup', mouseupHandler);

    function mousemoveHandler(e: MouseEvent) {
      const dx = e.clientX - lastX,
            dy = e.clientY - lastY;

      lastX = e.clientX;
      lastY = e.clientY;

      return mousemove(e, dx, dy);
    }

    function mouseupHandler(e: MouseEvent) {
      document.body.removeEventListener('mousemove', mousemoveHandler);
      window.removeEventListener('mouseup', mouseupHandler);

      return mouseup(e);
    }

    // oh no oh no oh no
    // const _stopPropagation = e.stopPropagation.bind(e);
    // e.stopPropagation = () => {
    //   _stopPropagation();
    // };
    return mousedown(e, mouseupHandler, mousemoveHandler);
  }
}

type DHR = typeof dragHelper;
type Arg1 = DHR extends (a: infer A, b: infer B, c: infer C) => any ? A : any;
type Arg2 = DHR extends (a: infer A, b: infer B, c: infer C) => any ? B : any;
type Arg3 = DHR extends (a: infer A, b: infer B, c: infer C) => any ? C : any;

// for use in React (ugh...)
export function dragHelperReact<T>(mousemove: Arg1, mousedown: Arg2, mouseup: Arg3) {
  return {
    onMouseDown: dragHelper(mousemove, mousedown, mouseup),
    onMouseUp: (e: React.MouseEvent<T>) => {
      e.persist();
      // this sucks
      e[Player.ignoreCanvasClick] = true;
    }
  }
}
