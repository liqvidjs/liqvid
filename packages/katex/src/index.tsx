export {KTX} from "./fancy";
export {KaTeXReady} from "./loading";
export {Handle} from "./plain";
export {RenderGroup} from "./RenderGroup";

declare global {
  const katex: typeof katex;
}
