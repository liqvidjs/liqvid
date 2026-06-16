/**
 * Parse \newcommand macros in a file.
 * Also supports \mjxnewcommand (for use alongside KaTeX).
 * @param file TeX file to parse
 */
export function parseMacros(file: string): Record<string, string> {
  // strip comments
  file = file.replace(/%.*$/gm, "");

  // look for \newcommand
  const macros: Record<string, string> = {};
  const rgx = /\\(?:mjx)?newcommand\{(.+?)\}(?:\[\d+\])?\{/g;
  let match: RegExpExecArray | null;

  // biome-ignore lint/suspicious/noAssignInExpressions: this is fine
  while ((match = rgx.exec(file))) {
    let body = "";

    const macro = match[1]!;
    let braceCount = 1;

    for (
      let i = match.index + match[0].length;
      braceCount > 0 && i < file.length;
      ++i
    ) {
      const char = file[i];
      if (char === "{") {
        braceCount++;
      } else if (char === "}") {
        braceCount--;
        if (braceCount === 0) break;
      } else if (char === "\\") {
        body += file.slice(i, i + 2);
        ++i;
        continue;
      }
      body += char;
    }
    macros[macro] = body;
  }
  return macros;
}
