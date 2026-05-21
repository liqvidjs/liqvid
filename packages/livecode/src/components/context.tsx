import { makeContext } from "@liqvid/utils";

export const { use: useGroup, Provider: GroupProvider } = makeContext<
  string | undefined
>({
  defaultValue: "default",
  name: "Group",
});

export const { useOptional: useFilenameOptional, Provider: FilenameProvider } =
  makeContext<string | undefined>({
    defaultValue: undefined,
    name: "Filename",
  });
