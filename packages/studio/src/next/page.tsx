import { notFound } from "next/navigation";

import { Jobs } from "../pages/jobs/jobs.tsx";
import { Homepage } from "../pages/root.tsx";

export default async function Pages({
  params: asyncParams,
  searchParams: _asyncSearchParams,
}: {
  params: Promise<Record<string, string[]>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await asyncParams;
  const paramsKeys = Object.keys(params);
  // const searchParams = await asyncSearchParams;
  const route =
    "/" + (paramsKeys.length === 1 ? params[paramsKeys[0]!]!.join("/") : "");

  switch (route) {
    case "/":
      return <Homepage />;
    case "/jobs":
      return <Jobs />;
  }

  notFound();
}
