# desmos-react

This package provides a wrapper to use the [Desmos API](https://www.desmos.com/api/v1.6/docs/) in React.

**This package is not affiliated with Desmos. To use this in your product or obtain an API key, please reach out to partnerships@desmos.com.**

## Installation

```bash
npm install desmos-react
```

**This package does not include Desmos itself. You still need to include it as your normally would, via**

```html
<script src="https://www.desmos.com/api/v1.11/calculator.js?apiKey=YOUR_API_KEY
```

## Usage

```tsx
import {
  Expression,
  GraphingCalculator,
  useHelperExpression,
} from "desmos-react";

function Demo() {
  return (
    <GraphingCalculator
      attributes={{ className: "calculator" }}
      fontSize={18}
      keypad
      projectorMode
    >
      <Expression id="slider" latex="a=3" />
      <Point />
    </GraphingCalculator>
  );
}

/* useHelperExpression() can only be used inside <GraphingCalculator/>,
which is why this couldn't go in <Demo/> */
function Point() {
  const a = useHelperExpression({ latex: "a" });

  let label;
  if (a > 0) label = "positive x-axis";
  else if (a < 0) label = "negative x-axis";
  else label = "origin";

  return <Expression id="point" latex="(a,0)" label={label} showLabel />;
}
```

## Reference

This package exports four components and two functions. See https://www.desmos.com/api/v1.6/docs/ for the full list of options.

`<GraphingCalculator>`, `<FourFunctionCalculator>`, `<ScientificCalculator>`

These load the various types of calculator Desmos provides. In addition to the [Desmos options](https://www.desmos.com/api/v1.6/docs/index.html#document-calculator), these support an `attributes` prop to attach additional attributes to the `<div>` hosting the calculator.

Using `ref` on a calculator will return a ref to the calculator object, not the div. If you need access to the div, use the `elt()` function below.

`<Expression>`

Desmos [expression](https://www.desmos.com/api/v1.6/docs/index.html#document-manipulating-expressions). Put these inside `<GraphingCalculator>`.

`useHelperExpression()`

Hook for using helper expressions, see above for usage.

`elt(calculator)`

This returns the `<div>` hosting a calculator.
