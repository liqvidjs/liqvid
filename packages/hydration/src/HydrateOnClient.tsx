import { IS_CLIENT } from "@liqvid/ssr";

import { golf } from "./golf.ts";
import { SneakyScript } from "./SneakyScript.tsx";
import type {
  ArgType,
  CustomSourceConfig,
  LocalValueConfig,
  SearchThenMessagesConfig,
  SimpleSourceConfig,
} from "./types.ts";

export function HydrateOnClient<
  const Config extends readonly LocalValueConfig[],
>({
  children,
  from,
  hydrationFn,
}: {
  children?: React.ReactNode;

  /**
   * You should always pass this with `as const`.
   */
  from: Config;

  /**
   * ***🚨 WARNING 🚨***
   * ***This does not behave like a regular JavaScript function.***
   * Instead, its literal string representation will be passed down to the client.
   * In particular, ***you cannot use any external variables or functions*** within this function.
   *
   * To avoid confusion, you can instead pass a string; however, a function is easier to work with in your editor.
   */
  hydrationFn:
    | string
    | ((
        ...args: {
          [key in keyof Config]: ArgType<Config[key]>;
        }
      ) => unknown);
}) {
  if (IS_CLIENT)
    return (
      <>
        {children}
        {
          /*
           * we need this null in place of the `<SneakyScript>` below in order
           * to preserve the tree structure for `useId()`
           */
          null
        }
      </>
    );

  let hasCookies = false;
  let hasLocalStorage = false;
  let hasSessionStorage = false;
  let hasSearchParams = false;

  const args = from
    .map((lvc) => {
      let value: string;

      switch (lvc.source ?? "localStorage") {
        case "cookie":
          assertType<SimpleSourceConfig>(lvc);
          hasCookies = true;
          value = `${golf.cookies}[${JSON.stringify(lvc.name)}]`;
          break;
        case "custom":
          assertType<CustomSourceConfig<unknown>>(lvc);
          value = `(${lvc.options.get})()`;
          break;
        case "localStorage":
          assertType<SimpleSourceConfig>(lvc);
          hasLocalStorage = true;
          value = `${golf.localStorage}.getItem(${JSON.stringify(lvc.name)})`;
          break;
        case "sessionStorage":
          assertType<SimpleSourceConfig>(lvc);
          hasSessionStorage = true;
          value = `${golf.sessionStorage}.getItem(${JSON.stringify(lvc.name)})`;
          break;
        case "search":
        case "search-then-messages":
          assertType<SimpleSourceConfig | SearchThenMessagesConfig<unknown>>(
            lvc,
          );
          hasSearchParams = true;
          value = `${golf.url}.get(${JSON.stringify(lvc.name)})`;
          break;
      }

      switch (lvc.type ?? "string") {
        case "boolean": {
          const defaultValue = lvc.default ?? "null";
          if (lvc.source === "custom") {
            return `(_$=${value},typeof _$=="boolean"?_$:_$?_$=="true":${defaultValue})`;
          }
          return `(_$=${value},_$?_$=="true":${defaultValue})`;
        }
        case "number": {
          if (typeof lvc.default !== "undefined") {
            if (lvc.source === "custom") {
              return `(_$=${value},typeof _$=="number"?_$:[parseFloat(_$),${lvc.default}].find(Number.isFinite))`;
            }
            return `[parseFloat(${value}),${lvc.default}].find(Number.isFinite)`;
          }

          if (lvc.source === "custom") {
            return `(_$=${value},typeof _$=="number"?_$:parseFloat(_$))`;
          }
          return `parseFloat(${value})`;
        }
        // https://github.com/biomejs/biome/issues/7229
        // case "string":
        default:
          if (typeof lvc.default !== "undefined") {
            return `${value}??${JSON.stringify(lvc.default)}`;
          }
          return value;
      }
    })
    .join(",");

  return (
    <>
      {children}
      <SneakyScript>
        {golf.comma(
          `let ${golf.document}=document`,
          `${golf.getElementById}=${golf.document}.getElementById.bind(d)`,
          hasCookies && cookieScript,
          hasLocalStorage && localStorageScript,
          hasSessionStorage && sessionStorageScript,
          hasSearchParams && searchScript,
        ) + ";"}
        {`(${hydrationFn})(${args})`}
      </SneakyScript>
    </>
  );
}

const cookieScript = `${golf.cookies}=Object.fromEntries(${golf.document}.cookie?.split(/;\\s*/).map(x=>x.split("="))??[]);`;
const localStorageScript = `${golf.localStorage}=localStorage`;
const sessionStorageScript = `${golf.sessionStorage}=sessionStorage`;
const searchScript = `${golf.url}=new URLSearchParams(location.search)`;

/**
 * Assert the type of a variable.
 *
 * TODO: ideally should not have to do this but I couldn't make the type magic work
 */
function assertType<K>(a: unknown): asserts a is K {}
