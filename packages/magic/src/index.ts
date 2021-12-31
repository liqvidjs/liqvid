import type {ScriptData, StyleData} from "./types";
export type {ScriptData, StyleData} from "./types";

/**
 * Template function.
 */
export function transform(content: string, config: {
  mode: "development" | "production";
  scripts: Record<string, ScriptData>;
  styles: Record<string, StyleData>;
}) {
  // insert scripts
  content = content.replaceAll(/<!-- @script "(.+?)" -->/g, (match, label: string) => {
    const script = config.scripts[label];
    if (!script) {
      console.warn(`Missing script ${label}`);
      return match;
    }

    if (typeof script === "string") {
      return tag("script", {src: script});
    } else {
      const handler = script[config.mode];
      if (!handler) {
        return "";
      }
  
      if (typeof handler === "string") {
        const attrs: any = {};
        attrs.src = handler;
        if (script.crossorigin) {
          attrs.crossorigin = "anonymous";//script.crossorigin;
        }
  
        if (config.mode === "production" && script.integrity) {
          attrs.integrity = script.integrity;
        }
  
        return tag("script", attrs);
      } else {
        return tag("script", {}, handler);
      }
    }
  });

  // insert styles
  content = content.replaceAll(/<!-- @style "(.+?)" -->/g, (match, label: string) => {
    const style = config.styles[label];
    if (!style) {
      console.warn(`Missing style ${label}`);
      return match;
    }

    const attrs: any = {
      rel: "stylesheet",
      type: "text/css"
    };

    if (typeof style === "string") {
      attrs.href = style;
    } else {
      attrs.href = style[config.mode];
    }

    return tag("link", attrs, true);
  });

  // insert json
  content = content.replaceAll(/<!-- @json "(.+?)" "(.+?)" -->/g, (match, label: string, src: string) => {
    return tag("link", {
      as: "fetch",
      "data-name": label,
      href: src,
      rel: "preload",
      type: "application/json"
    }, true);
  });

  // return
  return content;
}

/**
 * Create an HTML tag.
 */ 
export function tag<K extends keyof HTMLElementTagNameMap>(tagName: K, attrs: any = {}, nextOrClose: boolean | (() => string) = false) {
  const close = (nextOrClose === true);

  const attrString = Object.keys(attrs)
  .map(attr => {
    if (!attrs.hasOwnProperty(attr)) return "";

    if ("boolean" === typeof attrs[attr]) {
      if (attrs[attr]) return ` ${attr}`;
      return "";
    }

    // XXX make sure this is correct escaping
    const escaped = attrs[attr].toString().replace(/"/g, "&quot;");

    return ` ${attr}="${escaped}"`;
  })
  .join("");

  const str = `<${tagName}${attrString}`;

  if (close) return `${str}/>`;

  let content;
  switch (typeof nextOrClose) {
  case "function":
    content = nextOrClose();
    break;
  case "number":
  case "string":
    content = nextOrClose;
    break;
  default:
    content = "";
    break;
  }

  return `${str}>${content}</${tagName}>`;
}

export {scripts, styles} from "./default-assets";
