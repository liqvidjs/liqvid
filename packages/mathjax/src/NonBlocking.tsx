import {Utils, usePlayer} from "liqvid";
import {forwardRef, useEffect, useRef} from "react";
import {Handle as PlainHandle, MJX as MJXPlain} from "./plain";

const {combineRefs} = Utils.react;

interface Props extends React.ComponentProps<typeof MJXPlain> {
  /**
   * Whether to reparse the canvas.
   * @default false
   */
  reparse?: boolean;
}

export const MJX = forwardRef<PlainHandle, Props>(function MJX(props, ref) {
  const {reparse = false, ...attrs} = props;

  const plain = useRef<PlainHandle>();
  const combined = combineRefs(plain, ref);

  // reparsing
  const player = usePlayer();
  useEffect(() => {
    // reparsing
    if (reparse) {
      plain.current.ready.then(() => player.reparseTree(plain.current.domElement));
    }
  }, []);

  return (
    <MJXPlain ref={combined} {...attrs}/>
  );
});

// /**
// Promise for when MathJax has loaded. Option of defer
// */
// export const MathJaxReady = new Promise<typeof MathJax>((resolve) => {
//   // need to use this id if script has defer attribute
//   const script = document.querySelector(`script[src*="MathJax.js"]`);
//   if (!script) return;

//   // if MathJax already exists, resolve
//   // otherwise, add a load listener
//   if (window.hasOwnProperty("MathJax")) {
//     MathJax.Hub.Register.StartupHook("LoadHead Ready", () => resolve(MathJax));
//   } else {
//     script.addEventListener("load", () => MathJax.Hub.Register.StartupHook("LoadHead Ready", () => resolve(MathJax)));
//   }
// });

// interface Props extends React.HTMLAttributes<HTMLSpanElement> {
//   display?: boolean;
//   resize?: boolean;
//   renderer?: "HTML-CSS" | "CommonHTML" | "PreviewHTML" | "NativeMML" | "SVG" | "PlainSource";
// }

// export class MJXNonBlocking extends React.Component<Props> {
//   private resolveReady: () => void;
//   domElement: HTMLSpanElement;
//   jax: MathJax.ElementJax;

//   hub: EventEmitter;
//   ready: Promise<void>;

//   static defaultProps = {
//     display: false,
//     resize: false
//   }

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

//   render() {
//     const {children, display, resize, ...attrs} = this.props;

//     const [open, close] = display ? ["\\[", "\\]"] : ["\\(", "\\)"];

//     // Google Chrome fails without this
//     if (display) {
//       if (!attrs.style)
//         attrs.style = {};
//       attrs.style.display = "block";
//     }

//     return (
//       <span {...attrs} ref={node => this.domElement = node}>{open + children + close}</span>
//     );
//   }
// }

// interface MJXTextProps {
//   tagName?: keyof HTMLElementTagNameMap & JSX.IntrinsicElements;
// }

// export class MJXTextNonBlocking extends React.Component<MJXTextProps> {
//   private resolveReady: () => void;
//   private ref: React.RefObject<HTMLElement>;

//   ready: Promise<void>;

//   constructor(props: MJXTextProps) {
//     super(props);

//     this.ready = new Promise((resolve) => this.resolveReady = resolve);

//     this.ref = React.createRef<HTMLElement>();
//   }

//   async componentDidMount() {
//     await MathJaxReady;

//     typeset(this.ref.current)
//     .then(this.resolveReady);
//   }

//   render() {
//     const {tagName = "p", children, ...attrs} = this.props;
//     return React.createElement(tagName, {...attrs, ref: this.ref}, children);
//   }
// }

// // wait for a whole bunch of things to be rendered
// export class RenderGroup extends React.Component {
//   private promises: Promise<void>[];

//   ready: Promise<void>;

//   componentDidMount() {
//     this.ready = Promise.all(this.promises).then();
//   }

//   render() {
//     this.promises = [];

//     return recursiveMap(this.props.children, node => {
//       if (shouldInspect(node)) {
//         const originalRef = node.ref;
//         return React.cloneElement(node, {
//           ref: (ref: MJXNonBlocking) => {
//             if (!ref) return;
//             this.promises.push(ref.ready);
//             if (typeof originalRef === "function") {
//               originalRef(ref);
//             } else if (originalRef && typeof originalRef === "object") {
//               (originalRef as React.MutableRefObject<MJXNonBlocking>).current = ref;
//             }
//           }
//         });
//       }

//       return node;
//     });
//   }
// }

// function shouldInspect(node: React.ReactNode): node is React.ReactElement & React.RefAttributes<MJXNonBlocking> {
//   return React.isValidElement(node) && typeof node.type === "function" && node.type.prototype instanceof MJXNonBlocking;
// }

// // get rid of the stupid focus rule
// function killCSS() {
//   for (const style of Array.from(document.querySelectorAll("style"))) {
//     if (!style.textContent.match(/.MathJax:focus/)) continue;

//     const sheet = style.sheet as CSSStyleSheet;
    
//     for (let i = 0; i < sheet.cssRules.length; ++i) {
//       const rule = sheet.cssRules[i];

//       if (!isStyleRule(rule)) continue;

//       if (rule.selectorText.match(".MathJax:focus")) {
//         sheet.deleteRule(i);
//         break;
//       }
//     }
//   }
// }
// MathJaxReady.then(killCSS);

// // promisified MathJax
// export function typeset(node: HTMLElement): Promise<void> {
//   return new Promise(async (resolve, reject) => {
//     await MathJaxReady;
    
//     MathJax.Hub.Queue(["Typeset", MathJax.Hub, node]);
//     MathJax.Hub.Queue(resolve);
//   });
// }

// /* helper functions */
// function isStyleRule(rule: CSSRule): rule is CSSStyleRule {
//   return rule.type === rule.STYLE_RULE;
// }

// function onFullScreenChange(callback: EventListener) {
//   for (const event of ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"])
//     document.addEventListener(event, callback);
// }

// // belongs in a separate file, but currently only used here
// // (as well as in liqvidliqvid, but that can't be helped)
// export function recursiveMap(
//   children: React.ReactNode,
//   fn: (child: React.ReactNode) => React.ReactNode
// ): React.ReactNode {
//   return React.Children.map(children, (child) => {
//     if (!React.isValidElement(child)) {
//       return child;
//     }

//     if ("children" in child.props) {
//       child = React.cloneElement(child, {
//         children: recursiveMap(child.props.children, fn)
//       });
//     }

//     return fn(child);
//   });
// }
