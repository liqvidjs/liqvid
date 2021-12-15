export interface ScriptData {
  /**
   * Whether script is crossorigin.
   */ 
  crossorigin?: boolean;

  /**
   * Development URL.
   */ 
  development?: string | (() => string);

  /**
   * Integrity attribute for production.
   */
   integrity?: string; 

  /**
   * Production src.
   */
   production?: string; 
}

export type StyleData = string;

/**
 * Template function.
 */ 
export const template = (content: string, config: {
  mode: "development" | "production";
  scripts: Record<string, ScriptData>;
  styles: Record<string, StyleData>;
}) => {
  // insert scripts
  content = content.replaceAll(/<!-- @script "(.+?)" -->/g, (match, label: string) => {
    const script = config.scripts[label];
    if (!script) {
      console.warn(`Missing script ${label}`);
      return match;
    }

    const handler = script[config.mode];
    if (!handler) {
      return "";
    }

    if (typeof handler === "string") {
      const attrs: any = {};
      attrs.src = handler;
      if (script.crossorigin) {
        attrs.crossorigin = script.crossorigin;
      }

      if (config.mode === "production" && script.integrity) {
        attrs.integrity = script.integrity;
      }

      return tag("script", attrs);
    } else {
      return tag("script", {}, handler);
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
      href: style,
      rel: "stylesheet",
      type: "text/css"
    };
    return tag("link", attrs, true);
  });

  // return
  return content;
}

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
