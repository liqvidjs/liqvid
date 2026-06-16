import { parseMacros } from "../src/macros.ts";

describe("parseMacros", () => {
  it("should ignore comments", () => {
    const file = String.raw`
%\newcommand{\<}{\left\langle}
\newcommand{\>}{\right\rangle}
`;
    expect(parseMacros(file)).toEqual({
      "\\>": "\\right\\rangle",
    });
  });
});
