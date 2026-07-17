import { RelativeDir } from "effect-paths";
import { notFound } from "next/navigation";

import { Jobs } from "../pages/jobs/jobs.tsx";
import { Homepage } from "../pages/root.tsx";
import { getTranslations } from "../utils/i18n.mts";

type Params = {
  route: string[];
  [key: string]: string[] | undefined;
};

export default async function Pages({
  params,
  searchParams: _asyncSearchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  const route = getRoute(resolvedParams);

  switch (route) {
    case "/":
      return <Homepage />;
    case "/jobs":
      return <Jobs />;
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
    default:
      return { title: "Liqvid Studio" };
  }

  return { title: t.title };
}

function getRoute(params: Params): string {
  const paramsKeys = Object.keys(params);
  return (
    "/" + (paramsKeys.length === 1 ? params[paramsKeys[0]!]!.join("/") : "")
  );
}
