interface TextPosition {
  col: number;
  line: number;
}

export interface ScriptOffset {
  end: TextPosition;
  node: HTMLScriptElement;
  start: TextPosition;
}

export type WebConsoleMessageUp =
  | {
      characterNumber?: number;
      content: unknown[];
      filename?: string;
      lineNumber?: number;
      type:
        | "console.debug"
        | "console.error"
        | "console.info"
        | "console.log"
        | "console.warn";
    }
  | {
      type: "console.clear";
    };

/** Iframe client code for development magic */
export const magicScripts = `
(${() => {
  window.addEventListener("message", ({ data }) => {
    if (data.type === "update-css") {
      const styleTag = document.querySelector(
        "style[data-filename='" + data.filename + "']",
      );
      if (styleTag) {
        styleTag.textContent = data.content;
      }
    }
  });

  /* intercept console.log */
  {
    function formatArgs(args: unknown[]): unknown[];
    function formatArgs(args: unknown): unknown {
      if (Array.isArray(args)) {
        return args.filter((item) => !(item instanceof Node)).map(formatArgs);
      }
      return args;
    }
    const log = console.log;
    console.log = (...args) => {
      const message: WebConsoleMessageUp = {
        content: formatArgs(args),
        type: "console.log",
      };

      // fancy line-number magic
      const traceback = getTraceback(2);
      const $_ = traceback
        ?.match(/:(\d+):(\d+)\)?$/)
        ?.slice(1)
        .map(Number);
      if ($_ && $_.length === 2) {
        const [absoluteLineNumber, characterNumber] = $_ as [number, number];
        const offsets = getScriptNodeOffsets(document.documentElement);

        // find script
        const currentScript = offsets.find(({ start, end }) => {
          if (start.line > absoluteLineNumber) return false;
          if (start.line === absoluteLineNumber && start.col > characterNumber)
            return false;

          if (end.line < absoluteLineNumber) return false;
          if (end.line === absoluteLineNumber && end.col < characterNumber)
            return false;

          return true;
        });

        // set filename and offsets
        if (currentScript) {
          message.filename = currentScript.node.dataset.filename;
          message.lineNumber = absoluteLineNumber - currentScript.start.line;

          // TODO: this can be wrong on first line
          message.characterNumber = characterNumber;
        }
      }

      // post message
      try {
        window.parent.postMessage(message, "*");
      } catch (e) {
        console.error(e);
        log(...args);
      }
    };

    const clear = console.clear;
    console.clear = () => {
      window.parent.postMessage(
        {
          type: "console.clear",
        },
        "*",
      );
      clear();
    };
  }

  function getScriptNodeOffsets(rootNode: Node): ScriptOffset[] {
    const scriptNodes: ScriptOffset[] = [];

    let line = 0;
    let col = 0;

    const walker = document.createTreeWalker(
      rootNode,
      NodeFilter.SHOW_ALL,
      null,
    );

    let currentNode = walker.currentNode;
    let start = { col, line };

    while (currentNode) {
      if (isElement(currentNode)) {
        const name = currentNode.tagName.toLowerCase();

        if (name === "script") {
          start = { col, line };
        }

        // Opening tag & attributes
        [line, col] = update(`<${name}`, line, col);
        for (const attr of currentNode.attributes) {
          [line, col] = update(` ${attr.name}="${attr.value}"`, line, col);
        }
        // Self-closing tags
        if (
          !currentNode.hasChildNodes() &&
          !["div", "span", "p"].includes(name)
        ) {
          col += " />".length;
        } else {
          col += ">".length;
        }
      } else if (currentNode.nodeType === Node.TEXT_NODE) {
        [line, col] = update(currentNode.textContent || "", line, col);
      } else if (currentNode.nodeType === Node.COMMENT_NODE) {
        [line, col] = update(`<!--${currentNode.nodeValue}-->`, line, col);
      }

      // Move to next node or handle closing tags
      if (walker.nextNode() === null) {
        // Traverse back up and close tags if we reached the end
        let temp: Node | null = walker.currentNode;
        while (temp && temp !== rootNode) {
          if (isElement(temp)) {
            const tempName = temp.tagName.toLowerCase();
            col += `</${tempName}>`.length;

            if (tempName === "script") {
              scriptNodes.push({
                end: { col, line },
                node: temp as HTMLScriptElement,
                start,
              });
            }
          }
          temp = temp.parentNode;
        }
        break;
      }

      // If the walker is returning to a different parent, close the previous tag
      if (
        walker.currentNode.parentNode !== currentNode.parentNode &&
        currentNode.parentNode &&
        isElement(currentNode.parentNode)
      ) {
        const parentName = currentNode.parentNode.tagName.toLowerCase();
        col += `</${parentName}>`.length;

        if (parentName === "script") {
          scriptNodes.push({
            end: { col, line },
            node: currentNode.parentNode as HTMLScriptElement,
            start,
          });
        }
      }

      currentNode = walker.currentNode;
    }

    return scriptNodes;
  }

  function update(str: string, row: number, col: number): [number, number] {
    const lines = str.split("\n");
    if (lines.length === 1) {
      return [row, col + lines[0]!.length];
    }
    return [row + lines.length - 1, lines.at(-1)!.length];
  }

  function getTraceback(n: number) {
    try {
      throw new Error();
    } catch (e) {
      return (e as Error).stack!.split("\n")[n];
    }
  }

  function isElement(node: Node): node is Element {
    return node.nodeType === node.ELEMENT_NODE;
  }
}})()`;
