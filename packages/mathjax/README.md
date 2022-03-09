# @liqvid/mathjax

[MathJax](https://mathjax.org/) plugin for [Liqvid](https://liqvidjs.org).

## Usage

```tsx
import {MJX} from "@liqvid/mathjax";

function Quadratic() {
  return (
    <div>
      The value of <MJX>x</MJX> is given by the quadratic formula
      <MJX display>{String.raw`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`}</MJX>
    </div>
  );
}
```
