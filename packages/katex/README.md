# @liqvid/katex

[KaTeX](https://katex.org/) integration for [Liqvid](https://liqvidjs.org).

## Usage

```tsx
import {KTX} from "@liqvid/katex";

function Quadratic() {
  return (
    <div>
      The value of <KTX>x</KTX> is given by the quadratic formula
      <KTX display>{String.raw`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`}</KTX>
    </div>
  );
}
```

## Macros

For convenience, this module supports loading macro definitions from a file. Simply include a `<script type="math/tex">` tag in the `<head>` of your html, pointing to a tex file containing `\newcommand`s.

```html
<!-- this has to go in <head> -->
<script src="./macros.tex" type="math/tex"></script>
```
```tex
% macros.tex
\newcommand{\C}{\mathbb C}
```
