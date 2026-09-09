import { serialize } from "@liqvid/ssr/serde";
import { pick } from "@liqvid/utils";
import { Fiber } from "effect";
import { cookies } from "next/headers";

import type { LoggableJobClient, ServiceClient } from "#_/api/schemas.mjs";
import { WebSocketProvider } from "#_/components/WebSocketProvider.js";
import { JOBS_TAB_COOKIE, LOG_LEVELS_COOKIE } from "#_/cookies.js";
import type { Localized } from "#_/i18n/shared.mjs";
import { getServerState, initializeServer } from "#_/initialize.mjs";
import { broadcast } from "#_/next/websockets.mjs";
import { serverRuntime } from "#_/server-runtime.mjs";
import { getTranslations } from "#_/utils/i18n.mjs";

import { DEFAULT_LOG_LEVELS, JobsClient } from "./client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

async function cancelJob(formData: FormData) {
  "use server";

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const { jobs } = getServerState();
  const job = jobs.new.get(id);
  if (!job) return;

  await serverRuntime.runPromise(Fiber.interrupt(job.fiber));
}

async function deleteJob(formData: FormData) {
  "use server";

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const { jobs } = getServerState();

  jobs.new.delete(id);

  await serverRuntime.runPromise(
    broadcast("jobs", { data: { id }, type: "deleteJob" }),
  );
}

export async function Jobs() {
  await initializeServer();
  const t = await getTranslations<T>(import.meta.url);

  const { jobs: serverJobs, services: serverServices } = getServerState();

  const cookieStore = await cookies();
  const logLevelsCookie = cookieStore.get(LOG_LEVELS_COOKIE);
  const initialLogLevels: string[] = logLevelsCookie?.value
    ? JSON.parse(logLevelsCookie.value)
    : DEFAULT_LOG_LEVELS;

  const jobsTabCookie = cookieStore.get(JOBS_TAB_COOKIE);
  const initialTab = jobsTabCookie?.value === "services" ? "services" : "jobs";

  const jobs = Object.fromEntries(
    Array.from(serverJobs.new.entries()).map(
      ([id, job]) =>
        [id, pick(job, ["id", "logs", "name", "path", "state"])] as [
          string,
          LoggableJobClient,
        ],
    ),
  );

  const services = Object.fromEntries(
    Array.from(serverServices.entries()).map(
      ([id, service]) =>
        [id, pick(service, ["id", "logs", "name", "state"])] as [
          string,
          ServiceClient,
        ],
    ),
  );

  return (
    <WebSocketProvider>
      <JobsClient
        {...{
          cancelJob,
          deleteJob,
          initialLogLevels,
          initialTab,
          jobs: serialize(jobs),
          services: serialize(services),
          t,
        }}
      />
    </WebSocketProvider>
  );
}
