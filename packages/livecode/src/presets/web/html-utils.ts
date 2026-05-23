import type { ConsoleMessage } from "../../store.ts";

import { magicScripts } from "./magicScripts.ts";

export type WebConsoleMessage = ConsoleMessage<
  unknown[],
  "debug" | "error" | "info" | "log" | "warn"
>;

/** @package */
export function isWebConsoleMessage(
  msg: ConsoleMessage<unknown, string>,
): msg is WebConsoleMessage {
  return (
    typeof msg.data === "object" &&
    msg.data !== null &&
    Array.isArray(msg.data) &&
    (["debug", "error", "info", "log"] as (string | undefined)[]).includes(
      msg.kind,
    )
  );
}

/**
 * @package
 * Merge <link> and <script> tags into a single document
 */
export function render({
  css = {},
  js = {},
  esm = {},
  html,
}: {
  css?: Record<string, string>;
  js?: Record<string, string>;
  esm?: Record<string, string>;
  html: string;
}) {
  const doc = new DOMParser().parseFromString(html, "text/html");

  // replace <link> tags
  for (const linkTag of Array.from(
    doc.querySelectorAll("link[href]"),
  ) as HTMLLinkElement[]) {
    const href = linkTag.getAttribute("href")!;
    const styleSheet = css[normalizePath(href)];
    if (!styleSheet) continue;

    const style = doc.createElement("style");
    style.textContent = styleSheet;
    linkTag.replaceWith(style);
  }

  // replace <script> tags
  for (const scriptTag of Array.from(
    doc.querySelectorAll("script[src]"),
  ) as HTMLScriptElement[]) {
    const src = scriptTag.getAttribute("src")!;
    const normalized = normalizePath(src);
    const script = js[normalized];
    if (!script) continue;

    scriptTag.dataset.filename = normalized;
    scriptTag.removeAttribute("src");
    scriptTag.textContent = script;
  }

  // es module magic
  if (Object.keys(esm).length > 0) {
    const magicImports = Object.fromEntries(
      Object.entries(esm).map(([filename, file]) => [
        `./${filename}`,
        `data:text/javascript;charset=UTF-8,${encodeURIComponent(file)}`,
      ]),
    );

    let importMap = doc.querySelector(
      `script[type="importmap"]`,
    ) as HTMLScriptElement | null;
    if (importMap) {
      const existingImports = JSON.parse(importMap.innerText);
      importMap.innerText = JSON.stringify({
        imports: {
          ...existingImports.imports,
          ...magicImports,
        },
      });
    } else {
      importMap = doc.createElement("script");
      importMap.setAttribute("type", "importmap");
      importMap.appendChild(
        document.createTextNode(JSON.stringify({ imports: magicImports })),
      );
      doc.head.insertBefore(importMap, doc.head.firstChild);
    }
    if (!importMap) {
    }
  }

  // insert client script
  {
    const script = document.createElement("script");
    script.append(magicScripts);
    doc.querySelector("head")?.appendChild(script);
  }

  return serializeDocument(doc);
}

/** Serialize a Document back to HTML string, including doctype. */
export function serializeDocument(doc: Document) {
  return Array.from(doc.childNodes)
    .map((node) => {
      if (isDocumentTypeNode(node)) {
        let str = `<!DOCTYPE ${node.nodeName}`;
        if (node.publicId) {
          str += ` PUBLIC ${JSON.stringify(node.publicId)}`;
        }
        if (node.systemId) {
          str += ` ${JSON.stringify(node.systemId)}`;
        }
        str += ">";
        return str;
      } else if (isElement(node)) {
        return node.outerHTML;
      }
      return node.toString();
    })
    .join("");
}

/* ------------------------------ utils ------------------------------ */
function isDocumentTypeNode(node: Node): node is DocumentType {
  return node.nodeType === node.DOCUMENT_TYPE_NODE;
}

export function isElement(node: Node): node is Element {
  return node.nodeType === node.ELEMENT_NODE;
}

function normalizePath(path: string) {
  if (path.startsWith("./")) return path.slice("./".length);
  return path;
}
