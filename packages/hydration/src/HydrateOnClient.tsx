import { isClient } from "@liqvid/ssr";

import { golf } from "./golf";
import { SneakyScript } from "./SneakyScript";
import type { ArgType, LocalValueConfig } from "./types";

export function HydrateOnClient<Config extends readonly LocalValueConfig[]>({
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
  if (isClient) return <>{children}</>;

  let hasCookies = false;
  let hasLocalStorage = false;
  let hasSearchParams = false;

  const args = from
    .map((lvc) => {
      let value: string;

      switch (lvc.source ?? "localStorage") {
        case "cookie":
          hasCookies = true;
          value = `${golf.cookies}[${JSON.stringify(lvc.name)}]`;
          break;
        case "localStorage":
          hasLocalStorage = true;
          value = `${golf.localStorage}.getItem(${JSON.stringify(lvc.name)})`;
          break;
        case "search":
          hasSearchParams = true;
          value = `${golf.url}.get(${JSON.stringify(lvc.name)})`;
          break;
      }

      switch (lvc.type ?? "string") {
        case "boolean": {
          const defaultValue = lvc.default ?? "null";
          return `${value}?${value}=="true":${defaultValue}`;
        }
        case "number": {
          if (typeof lvc.default !== "undefined") {
            return `[parseFloat(${value}),${lvc.default}].find(Number.isFinite)`;
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
          hasSearchParams && searchScript,
        ) + ";"}
        {`(${hydrationFn})(${args})`}
      </SneakyScript>
    </>
  );
}

const cookieScript = `${golf.cookies}=Object.fromEntries(${golf.document}.cookie?.split(/;\\s*/).map(x=>x.split("="))??[]);`;
const localStorageScript = `${golf.localStorage}=localStorage`;
const searchScript = `${golf.url}=new URLSearchParams(location.search)`;
