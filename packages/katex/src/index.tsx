export {KTXBlocking as KTX, KTXBlocking} from "./Blocking";
export {KaTeXReady} from "./loading";
export {Handle, KTXNonBlocking} from "./NonBlocking";
export {RenderGroup} from "./RenderGroup";

declare global {
  const katex: typeof katex;
}

