import {combineRefs, usePromise} from "@liqvid/utils/react";
import {createElement, forwardRef, useEffect, useImperativeHandle, useRef} from "react";
import {MathJaxReady} from "./loading";

/**
 * MJX element API
 */
export interface Handle {
  /** Underlying <span> or <mjx-container> element. */
  domElement: HTMLElement;

  /** Promise that resolves once typesetting is finished */
  ready: Promise<void>;
}

interface Props extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Whether to render in display mode
   * @default false
   */
  display?: boolean;

  /**
   * Whether to rerender on resize (necessary for XyJax)
   * @default false
   */
  resize?: boolean;

  /**
   * Whether to wrap in a <span> element or insert directly (default)
   * @default false
   */
  span?: boolean;
}

/** Component for MathJax code */
export const MJX = forwardRef<Handle, Props>(function MJX(props, ref) {
  const {
    children,
    display = false, resize = false, span = false,
    ...attrs
  } = props;

  const spanRef = useRef<HTMLElement>();
  const [ready, resolve] = usePromise();

  /* typeset */
  useEffect(() => {
    MathJaxReady.then(() => {
      MathJax.typeset([spanRef.current]);

      // replace wrapper span with content
      if (!span) {
        const element = spanRef.current.firstElementChild as HTMLElement;

        // copy classes
        for (let i = 0, len = spanRef.current.classList.length; i < len; ++i) {
          element.classList.add(spanRef.current.classList.item(i));
        }

        // copy dataset
        Object.assign(element.dataset, spanRef.current.dataset);

        // overwrite element
        spanRef.current.replaceWith(element);
        spanRef.current = element;
      }

      resolve();
    });
  }, [children]);

  // handle
  useImperativeHandle(ref, () => ({
    get domElement() {
      return spanRef.current;
    },
    ready
  }));

  const [open, close] = display ? ["\\[", "\\]"] : ["\\(", "\\)"];

  // Google Chrome fails without this
  // if (display) {
  //   if (!attrs.style)
  //     attrs.style = {};
  //   attrs.style.display = "block";
  // }

  return (
    <span {...attrs} ref={spanRef}>{open + children + close}</span>
  );
});

function onFullScreenChange(callback: EventListener): void {
  for (const event of ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"])
    document.addEventListener(event, callback);
}

//   constructor(props: Props) {
//     super(props);
//     this.hub = new EventEmitter();
//     // hub will have lots of listeners, turn off warning
//     this.hub.setMaxListeners(0);

//     this.ready = new Promise((resolve) => this.resolveReady = resolve);

//     for (const method of ["Rerender", "Text", "Typeset"]) {
//       this[method] = this[method].bind(this);
//     }
//   }

//   async componentDidMount() {
//     await MathJaxReady;

//     this.Typeset()
//     .then(() => this.jax = MathJax.Hub.getAllJax(this.domElement)[0])
//     .then(this.resolveReady);

//     if (this.props.resize) {
//       window.addEventListener("resize", this.Rerender);
//       onFullScreenChange(this.Rerender);
//     }
//   }

//   shouldComponentUpdate(nextProps: Props) {
//     const text = this.props.children instanceof Array ? this.props.children.join("") : this.props.children,
//           nextText = nextProps.children instanceof Array ? nextProps.children.join("") : nextProps.children;

//     // rerender?
//     if (this.jax && text !== nextText) {
//       this.Text(nextProps.children as string);
//     }

//     // classes changed?
//     if (this.props.className !== nextProps.className) {
//       const classes = this.props.className ? this.props.className.split(" ") : [],
//             newClasses = nextProps.className ? nextProps.className.split(" ") : [];

//       const add = newClasses.filter(_ => !classes.includes(_)),
//             remove = classes.filter(_ => !newClasses.includes(_));

//       for (const _ of remove)
//         this.domElement.classList.remove(_);
//       for (const _ of add)
//         this.domElement.classList.add(_);
//     }

//     // style attribute changed?
//     if (JSON.stringify(this.props.style) !== JSON.stringify(nextProps.style)) {
//       (Object.keys(this.props.style || {}) as (keyof React.CSSProperties)[])
//       .filter(_ => !(nextProps.style || {}).hasOwnProperty(_))
//       .forEach(_ => this.props.style[_] = null);
//       Object.assign(this.domElement.style, nextProps.style);
//     }

//     return false;
//   }

//   Rerender() {
//     MathJax.Hub.Queue(["Rerender", MathJax.Hub, this.domElement]);
//     MathJax.Hub.Queue(() => this.hub.emit("Rerender"));
//   }

//   Text(text: string): Promise<void> {
//     return new Promise((resolve) => {
//       const tasks: [] = [];

//       if (this.props.renderer) {
//         const renderer = MathJax.Hub.config.menuSettings.renderer;
//         tasks.push(["setRenderer", MathJax.Hub, this.props.renderer]);
//         tasks.push(["Text", this.jax, text]);
//         tasks.push(["setRenderer", MathJax.Hub, renderer]);
//       } else {
//         tasks.push(["Text", this.jax, text]);
//       }

//       tasks.push(() => this.hub.emit("Text"));
//       tasks.push(resolve);

//       MathJax.Hub.Queue(...tasks);
//     });
//   }

//   Typeset(): Promise<void> {
//     return new Promise((resolve) => {
//       const tasks = [];

//       if (this.props.renderer) {
//         const renderer = MathJax.Hub.config.menuSettings.renderer;
//         tasks.push(["setRenderer", MathJax.Hub, this.props.renderer]);
//         tasks.push(["Typeset", MathJax.Hub, this.domElement]);
//         tasks.push(["setRenderer", MathJax.Hub, renderer]);
//       } else {
//         tasks.push(["Typeset", MathJax.Hub, this.domElement]);
//       }

//       tasks.push(() => this.hub.emit("Typeset"));
//       tasks.push(resolve);

//       MathJax.Hub.Queue(...tasks);
//     });
//   }
// }

/**
 * Element which will render any MathJax contained inside
 */
export const MJXText = forwardRef<unknown, {
  /** HTML tag to insert.
   * @default "p"
   */
  tagName?: keyof (HTMLElementTagNameMap & JSX.IntrinsicElements);
} & React.HTMLAttributes<HTMLElement>>(function MJXText(props, ref) {
  const elt = useRef<HTMLElement>();
  const combined = combineRefs(elt, ref);

  useEffect(() => {
    MathJax.startup.promise.then(() => {
      MathJax.typeset([elt.current]);
    });
  }, []);

  const {tagName = "p", children, ...attrs} = props;
  return createElement(tagName, {...attrs, ref: combined}, children);
});
