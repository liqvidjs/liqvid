import { makeContext } from "@liqvid/utils";

export const { use: useGroup, Provider: GroupProvider } = makeContext<
  null | string
>({
  defaultValue: "default",
  name: "Group",
});

export const { useOptional: useFilenameOptional, Provider: FilenameProvider } =
  makeContext<null | string>({
    defaultValue: null,
    name: "Filename",
  });
