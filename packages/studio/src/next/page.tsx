import { RelativeDir } from "effect-paths";
import { notFound } from "next/navigation";

import { Jobs } from "../pages/jobs/server.tsx";
import { Homepage } from "../pages/root.tsx";
import { Settings } from "../pages/settings/server.tsx";
import { getTranslations } from "../utils/i18n.ts";

type Params = Readonly<{
  route: readonly string[];
  [key: string]: readonly string[] | undefined;
}>;

// biome-ignore lint/style/noDefaultExport: needed for Next
export default async function Pages({
  params,
  searchParams: _asyncSearchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<
    Readonly<Record<string, string | readonly string[] | undefined>>
  >;
}) {
  const resolvedParams = await params;
  const route = getRoute(resolvedParams);

  switch (route) {
    case "/":
      return <Homepage />;
    case "/jobs":
      return <Jobs />;
    case "/settings":
      return <Settings />;
  }

  notFound();
}

export async function generateMetadata({
  params: asyncParams,
}: {
  params: Promise<Params>;
}) {
  const resolvedParams = await asyncParams;
  const route = getRoute(resolvedParams);

  type T = {
    title: string;
  };

  let t: T;

  switch (route) {
    case "/": {
      t = await getTranslations<T>(import.meta.url, RelativeDir("../pages"));
      break;
    }
    case "/jobs":
      t = await getTranslations<T>(
        import.meta.url,
        RelativeDir("../pages/jobs"),
      );
      break;

    case "/settings":
      t = await getTranslations<T>(
        import.meta.url,
        RelativeDir("../pages/settings"),
      );
      break;
    default:
      return { title: "Liqvid" };
  }

  return { title: t.title };
}

function getRoute(params: Params): string {
  const paramsKeys = Object.keys(params);
  return (
    "/" + (paramsKeys.length === 1 ? params[paramsKeys[0]!]!.join("/") : "")
  );
}
