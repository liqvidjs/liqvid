import { isClient } from "@liqvid/ssr";
import * as Slot from "@radix-ui/react-slot";
import { useId } from "react";

import { golf } from "./golf";
import { HydrateOnClient } from "./HydrateOnClient";
import type {
  BooleanValueConfig,
  ComparisonVariant,
  NumericValueConfig,
  NumericVariant,
  StringValueConfig,
  StringVariant,
} from "./types";
import { comparisonCondition, matches, stringCondition } from "./utils";

interface BooleanVariantConfig extends BooleanValueConfig {
  variants: {
    false: React.ReactElement;
    true: React.ReactElement;
  };
  value: boolean;
}

export interface NumericVariantConfig extends NumericValueConfig {
  variants: ComparisonVariant<number>[];
  value: number;
}

export interface StringVariantConfig extends StringValueConfig {
  variants: StringVariant[];
  value: string;
}

type VariantConfig =
  | BooleanVariantConfig
  | NumericVariantConfig
  | StringVariantConfig;

/**
 * Render one of many possible variants depending on a client value
 */
export function HydrateVariants(props: VariantConfig) {
  const id = useId();

  const variantNodes = (() => {
    switch (props.type) {
      case "boolean": {
        if (isClient) {
          return props.variants[`${props.value}`];
        }
        return [false, true].map((variant) => (
          <Slot.Root id={`${id}-${variant}`} key={String(variant)}>
            {props.variants[`${variant}`]}
          </Slot.Root>
        ));
      }
      case "number":
      case "string":
        if (isClient) {
          const selected = props.variants.find((variant) =>
            matches(props.value, variant),
          );
          if (!selected) {
            throw new Error("no matching variant");
          }

          return <>{selected.children}</>;
        } else {
          return props.variants.map((variant, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: this is safe
            <Slot.Root id={`${id}-${i}`} key={i}>
              {variant.children}
            </Slot.Root>
          ));
        }
    }
  })();

  return (
    <HydrateOnClient
      from={[props] as const}
      hydrationFn={
        (props.type === "boolean" && booleanScript(id)) ||
        (props.type === "number" && numberScript(id, props.variants)) ||
        (props.type === "string" && stringScript(id, props.variants)) ||
        ""
      }
    >
      {variantNodes}
    </HydrateOnClient>
  );
}

const booleanScript = (id: string) =>
  [
    `(v)=>{`,
    `${golf.getElementById}(${JSON.stringify(`${id}-`)}+!v).remove();`,
    `${golf.getElementById}(${JSON.stringify(`${id}-`)}+v).removeAttribute("id")`,
    `}`,
  ].join("");

const numberScript = (id: string, options: NumericVariant[]) => {
  return golf.join(
    `(${golf.value})=>{`,
    ...options.map((o, index) =>
      golf.join(
        index === 0 ? "let " : "",
        `${golf.node}=${golf.getElementById}(${JSON.stringify(id + "-" + index)});`,
        `if(${comparisonCondition(o)})`,
        `${golf.node}.removeAttribute("id");`,
        `else `,
        `${golf.node}.remove();`,
      ),
    ),
    `}`,
  );
};

const stringScript = (id: string, options: StringVariant[]) => {
  return golf.join(
    `(${golf.value})=>{`,
    ...options.map((o, index) =>
      golf.join(
        index === 0 ? "let " : "",
        `${golf.node}=${golf.getElementById}(${JSON.stringify(id + "-" + index)});`,
        `if(${stringCondition(o)})`,
        `${golf.node}.removeAttribute("id");`,
        `else `,
        `${golf.node}.remove();`,
      ),
    ),
    `}`,
  );
};
