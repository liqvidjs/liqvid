import {
  Expression,
  GraphingCalculator,
  useCalculator,
  useHelperExpression,
} from "../../../src/index.tsx";
import "./App.css";

export default function App() {
  return (
    <GraphingCalculator
      attributes={{ className: "calculator" }}
      fontSize={18}
      keypad
      projectorMode
    >
      <Expression id="slider" latex="x=2" />
      {/* <Point /> */}
      {import.meta.env.DEV && <Debug />}
    </GraphingCalculator>
  );
}

/* useHelperExpression() can only be used inside <GraphingCalculator/>,
which is why this couldn't go in <Demo/> */
function Point() {
  const a = useHelperExpression({ latex: "a" });

  let label: string;
  if (a > 0) label = "positive x-axis";
  else if (a < 0) label = "negative x-axis";
  else label = "origin";

  return <Expression id="point" latex="(a,0)" label={label} showLabel />;
}

/** Inject calculator into global scope for debugging */
function Debug() {
  // biome-ignore lint/suspicious/noExplicitAny: for development convenience
  (window as any).c = useCalculator();

  return null;
}
