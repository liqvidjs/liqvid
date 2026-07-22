import { WebConsole as UnstyledWebConsole } from "@lqv/livecode/web";
import { useColorScheme } from "liqvid";
import { chromeDark, chromeLight, ObjectInspector } from "react-inspector";

export function WebConsole() {
  const { colorScheme } = useColorScheme();

  return (
    <UnstyledWebConsole
      boolean="text-green-800"
      log={({ characterNumber, filename, lineNumber }, { children }) => (
        <li className="flex gap-1 border-b border-b-gray-200 px-1 dark:border-b-gray-700">
          {children}
          {filename && (
            <pre className="ml-auto text-slate-600 text-sm">
              {filename}
              {lineNumber && (
                <span className="text-slate-400">
                  {`:${lineNumber}`}
                  {characterNumber && `:${characterNumber}`}
                </span>
              )}
            </pre>
          )}
        </li>
      )}
      null="text-gray-500"
      number="text-green-800"
      object={({ data }, props) => (
        <ObjectInspector
          data={data}
          theme={
            {
              ...(colorScheme === "dark" ? chromeDark : chromeLight),
              BASE_BACKGROUND_COLOR: "transparent",
              BASE_FONT_SIZE: "1em",
              TREENODE_FONT_SIZE: "1em",
              // biome-ignore lint/suspicious/noExplicitAny: types are wrong
            } as any
          }
          {...props}
        />
      )}
      string="dark:text-white"
      symbol="text-pink-500"
      undefined="text-gray-500"
    />
  );
}
