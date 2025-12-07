import { isClient } from "@liqvid/ssr";

type Joinable = false | string | Joinable[];

/**
 * Render content as IIFE in a self-removing script tag
 * On the client, does nothing
 */
export function SneakyScript({ children }: { children: Joinable }) {
  if (isClient) return null;

  return (
    <script>{`(()=>{${combine(children)};document.currentScript.remove()})()`}</script>
  );
}

function combine(content: Joinable): string {
  if (typeof content === "string") return content;
  if (content === false) return "";

  return content.reduce<string>((acc, curr) => {
    if (typeof curr === "string") {
      acc += curr;
    } else if (Array.isArray(curr)) {
      acc += combine(curr);
    }

    return acc;
  }, "");
}
