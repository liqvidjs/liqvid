/// <reference types="desmos" />

import {
  createContext,
  forwardRef,
  memo,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { useIsStrictMode } from "./strict-mode";

interface InternalApi {
  id: string;
  rerender: () => void;
  updates: Record<string, Partial<Desmos.ExpressionState>>;
}

const DesmosContext = createContext<Desmos.Calculator | null>(null);
const InternalContext = createContext<InternalApi>({
  id: ":desmos",
  rerender: () => {},
  updates: {},
});

/* elt() */
declare global {
  namespace Desmos {
    interface BasicCalculator {
      domChangeDetector: {
        elt: HTMLDivElement;
      };
    }

    interface Calculator {
      domChangeDetector: {
        elt: HTMLDivElement;
      };
    }
  }
}

/**
 * Get the container element of a calculator.
 */
export function elt(
  calc: Desmos.Calculator | Desmos.BasicCalculator,
): HTMLDivElement {
  return calc.domChangeDetector.elt;
}

// -------------------- fancy calculators -------------------

/**
 * The Desmos graphing calculator.
 */
export const GraphingCalculator = makeFancyCalculator(
  // we need to do this weirdness to avoid crashing before Desmos has loaded
  (...args: Parameters<typeof Desmos.GraphingCalculator>) =>
    Desmos.GraphingCalculator(...args),
  "GraphingCalculator",
);

/**
 * The Desmos 3D graphing calculator.
 */
export const Calculator3D = makeFancyCalculator(
  (...args: Parameters<typeof Desmos.Calculator3D>) =>
    Desmos.Calculator3D(...args),
  "Calculator3D",
);

/**
 * The Desmos geometry calculator.
 */
export const GeometryCalculator = makeFancyCalculator(
  (...args: Parameters<typeof Desmos.Geometry>) => Desmos.Geometry(...args),
  "GeometryCalculator",
);

function makeFancyCalculator<
  T extends
    | typeof Desmos.Calculator3D
    | typeof Desmos.GraphingCalculator
    | typeof Desmos.Geometry,
>(constr: T, name: string) {
  const component = (
    props: React.PropsWithChildren<
      Parameters<T>[1] & {
        attributes?: React.HTMLAttributes<HTMLDivElement>;
      } & Pick<
          React.HTMLAttributes<HTMLDivElement>,
          "aria-hidden" | "className" | "style"
        >
    >,
    ref: React.ForwardedRef<Desmos.Calculator>,
  ) => {
    const [calculator, setCalculator] = useState<Desmos.Calculator | null>(
      null,
    );
    const div = useRef<HTMLDivElement>(null);

    const id = useId();

    const api = useMemo(() => {
      let prev: Desmos.ExpressionState[] = [];
      let timeout: number;
      const debounceInterval = 5;

      return {
        id,
        rerender: () => {
          const performUpdate = () => {
            if (!div.current) return;
            if (!calculator) return;

            // biome-ignore lint/suspicious/noExplicitAny: not exposed
            if ((calculator as any)._destroyed) {
              return;
            }

            const expressionUpdates = Array.from(
              div.current.querySelectorAll<HTMLSpanElement>(
                "span[data-desmos-id]",
              ),
            ).map((x) => {
              const { desmosId } = x.dataset;
              return api.updates[desmosId];
            });
            const existingExpressions = calculator
              .getExpressions()
              .reduce((acc, expr) => {
                acc[expr.id] = expr;
                return acc;
              }, {});

            const updates: Desmos.ExpressionState[] = [];
            let removals: { id: string }[] = [];
            let additions: Desmos.ExpressionState[] = [];

            for (let i = 0; i < expressionUpdates.length; ++i) {
              const expr = expressionUpdates[i];
              const prevExpr = prev[i];

              if (prevExpr === undefined) {
                additions = expressionUpdates.slice(i).map((update) => ({
                  ...existingExpressions[update.id],
                  ...update,
                }));
                break;
              }

              if (expr.id !== prevExpr.id) {
                removals = prev.slice(i).map(({ id }) => ({ id }));
                additions = expressionUpdates.slice(i).map((update) => ({
                  ...existingExpressions[update.id],
                  ...update,
                }));
                break;
              }

              updates[expr.id] = expr;
            }

            calculator.setExpressions(Object.values(updates));
            calculator.removeExpressions(removals);
            calculator.setExpressions(additions);

            prev = expressionUpdates;
          };

          // debounce
          window.clearTimeout(timeout);
          timeout = setTimeout(performUpdate, debounceInterval);
        },
        updates: {} as Record<string, Desmos.ExpressionState>,
      };
    }, [calculator, id]);

    // initialize
    // biome-ignore lint/correctness/useExhaustiveDependencies: ref is stable, props should not re-create
    useEffect(() => {
      if (div.current === null) {
        return;
      }

      /** Strict Mode double-rendering */
      let alive = true;

      let calculator: Desmos.Calculator | undefined;

      desmosLoaded.then(() => {
        if (!div.current) return;
        if (!alive) return;

        // create calculator
        const { attributes, children, ...options } = props;
        const calculator = constr(div.current, options);

        applyRef(ref, calculator);
        setCalculator(calculator);
      });

      return () => {
        alive = false;
        calculator?.destroy();
      };
    }, []);

    useEffect(() => {
      const {
        attributes,
        children,
        className,
        style,
        "aria-hidden": _,
        ...settings
      } = props;

      if (calculator) calculator.updateSettings(settings);
    });

    return (
      <InternalContext.Provider value={api}>
        <DesmosContext.Provider value={calculator}>
          <div
            ref={div}
            {...(props.attributes ?? {})}
            aria-hidden={props["aria-hidden"]}
            className={props.className}
            style={props.style}
          >
            {calculator ? props.children : null}
          </div>
        </DesmosContext.Provider>
      </InternalContext.Provider>
    );
  };

  // function components need to have a name
  Object.defineProperty(component, "name", { value: name });

  return forwardRef(component);
}

// -------------------- basic calculators -------------------

/**
 * The Desmos four-function calculator.
 */
export const FourFunctionCalculator = makeBasicCalculator(
  (...args: Parameters<typeof Desmos.FourFunctionCalculator>) =>
    Desmos.FourFunctionCalculator(...args),
  "FourFunctionCalculator",
);

/**
 * The Desmos scientific calculator.
 */
export const ScientificCalculator = makeBasicCalculator(
  (...args: Parameters<typeof Desmos.ScientificCalculator>) =>
    Desmos.ScientificCalculator(...args),
  "ScientificCalculator",
);

function makeBasicCalculator<
  T extends
    | typeof Desmos.FourFunctionCalculator
    | typeof Desmos.ScientificCalculator,
>(constr: T, name: string) {
  const component = (
    props: React.PropsWithChildren<
      Parameters<T>[1] & { attributes?: React.HTMLAttributes<HTMLDivElement> }
    >,
    ref: React.ForwardedRef<Desmos.BasicCalculator>,
  ) => {
    const [calculator, setCalculator] = useState<Desmos.BasicCalculator>();
    const div = useRef<HTMLDivElement>(null);

    // create calculator
    // biome-ignore lint/correctness/useExhaustiveDependencies: constr and ref are stable
    useEffect(() => {
      let calculator: Desmos.BasicCalculator | undefined;

      /** Strict Mode double-rendering */
      let alive = true;

      desmosLoaded.then(() => {
        if (!div.current) return;
        if (!alive) return;

        const { attributes, children, ...options } = props;
        const calculator = constr(div.current, options);

        applyRef(ref, calculator);
        setCalculator(calculator);
      });

      return () => {
        alive = false;
        calculator?.destroy();
      };
    }, [props]);

    // update settings
    useEffect(() => {
      const { attributes, children, ...settings } = props;

      if (calculator) calculator.updateSettings(settings);
    });

    // render
    return <div ref={div} {...(props.attributes ?? {})} />;
  };
  // function components need to have a name
  Object.defineProperty(component, "name", { value: name });

  return forwardRef(component);
}

// -------------------- other components -------------------

/**
 * A Desmos {@link https://www.desmos.com/api/v1.11/docs/#document-expressions expression}.
 */
export const Expression = memo(function Expression(
  props: Desmos.ExpressionState,
): React.ReactElement {
  const api = useInternalApi();
  const prevProps = useRef({} as Partial<Desmos.ExpressionState>);
  const calculator = useCalculator();

  const strictMode = useIsStrictMode();

  useEffect(() => {
    if (strictMode.current) {
      return;
    }

    if (!calculator) return;

    // diff props
    const propsDiff: Partial<Desmos.ExpressionState> = {
      id: props.id,
      type: props.type ?? "expression",
    };

    for (const key of Object.keys(props)) {
      if (key === "type" || key === "id") {
        continue;
      }
      if (props[key] === prevProps.current[key]) continue;
      propsDiff[key] = props[key];
    }

    for (const key of Object.keys(prevProps.current)) {
      if (key === "type" || key === "id") continue;
      if (!(key in props)) {
        propsDiff[key] = undefined;
      }
    }

    prevProps.current = props;

    api.updates[props.id] = propsDiff;
    api.rerender();

    return () => {
      delete api.updates[props.id];
      api.rerender();
    };
  }, [api, props, calculator]);

  // need to insert a dummy tag to figure out the expression position
  return (
    <span
      data-desmos-id={props.id}
      data-desmos-type={props.type ?? "expression"}
      hidden
    />
  );
});

// -------------------- hooks -------------------

/**
 * Get a reference to the containing {@link Calculator}.
 */
export function useCalculator(): Desmos.Calculator {
  const calculator = useContext(DesmosContext);
  if (calculator === null) {
    throw new Error("useCalculator must be used within a Calculator");
  }

  return calculator;
}

/**
 * Subscribe to a Desmos {@link https://www.desmos.com/api/v1.11/docs/#document-helper-expressions Helper Expression}.
 */
export function useHelperExpression(opts: Desmos.ExpressionState): number {
  const calculator = useCalculator();

  const helper =
    useRef<ReturnType<Desmos.Calculator["HelperExpression"]>>(null);
  if (helper.current === undefined) {
    helper.current = calculator.HelperExpression(opts);
  }
  const [value, setValue] = useState(helper.current.numericValue);
  useEffect(() => {
    helper.current.observe("numericValue", () =>
      setValue(helper.current.numericValue),
    );
  }, []);

  return value;
}

// -------------------- internal utils -------------------
function applyRef<T>(ref: React.ForwardedRef<T>, val: T) {
  if (ref === null) return;
  if (typeof ref === "function") {
    ref(val);
  } else {
    ref.current = val;
  }
}

function useInternalApi() {
  return useContext(InternalContext);
}

/** Returns a Promise that resolves once `callback` returns true. */
function waitFor(callback: () => boolean, interval: number): Promise<void> {
  return new Promise((resolve) => {
    const checkCondition = () => {
      if (callback()) {
        resolve();
      } else {
        setTimeout(checkCondition, interval);
      }
    };

    checkCondition();
  });
}

/* Promise that resolves once Desmos is loaded. */
export const desmosLoaded = waitFor(
  () => typeof globalThis.Desmos !== "undefined",
  100,
);
