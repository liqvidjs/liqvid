// option of loading KaTeX asynchronously
const KaTeXLoad = new Promise<typeof katex>((resolve) => {
  const script = document.querySelector(`script[src*="katex.js"], script[src*="katex.min.js"]`);
  if (!script) return;

  if (window.hasOwnProperty("katex")) {
    resolve(katex);
  } else {
    script.addEventListener("load", () => resolve(katex));
  }
});

// load macros from <head>
const KaTeXMacros = new Promise<{[key: string]: string;}>((resolve) => {
  const macros: {[key: string]: string;} = {};
  const scripts: HTMLScriptElement[] = Array.from(document.querySelectorAll("head > script[type='math/tex']"));
  return Promise.all(
    scripts.map(script =>
      fetch(script.src)
      .then(res => {
        if (res.ok)
          return res.text();
        throw new Error(`${res.status} ${res.statusText}: ${script.src}`);
      })
      .then(tex => {
        Object.assign(macros, parseMacros(tex));
      })
    )
  ).then(() => resolve(macros));
});

/**
 * Ready Promise
 */
export const KaTeXReady = Promise.all([KaTeXLoad, KaTeXMacros]);

/**
Parse \newcommand macros in a file.
Also supports \ktxnewcommand (for use in conjunction with MathJax).
*/
function parseMacros(file: string) {
  const macros = {};
  const rgx = /\\(?:ktx)?newcommand\{(.+?)\}(?:\[\d+\])?\{/g;
  let match: RegExpExecArray;
  
  while (match = rgx.exec(file)) {
    let body = "";

    const macro = match[1];
    let braceCount = 1;

    for (let i = match.index + match[0].length; (braceCount > 0) && (i < file.length); ++i) {
      const char = file[i];
      if (char === "{") {
        braceCount++;
      } else if (char === "}") {
        braceCount--;
        if (braceCount === 0)
          break;
      } else if (char === "\\") {
        body += file.slice(i, i+2);
        ++i;
        continue;
      }
      body += char;
    }
    macros[macro] = body;
  }
  return macros;
}
