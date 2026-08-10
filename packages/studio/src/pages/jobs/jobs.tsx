import { pick } from "@liqvid/utils";
import { Effect, Fiber } from "effect";
import { cookies } from "next/headers";

import { WebSocketProvider } from "../../components/WebSocketProvider.tsx";
import { LOG_LEVELS_COOKIE } from "../../cookies.ts";
import { getServerState, initializeServer } from "../../initialize.mts";
import { broadcast } from "../../next/websockets.mts";
import { getTranslations } from "../../utils/i18n.mts";

import { DEFAULT_LOG_LEVELS, JobsClient } from "./jobs.client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

async function cancelJob(formData: FormData) {
  "use server";

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const { jobs } = getServerState();
  const job = jobs.new.get(id);
  if (!job) return;

  await Effect.runPromise(Fiber.interrupt(job.fiber));
}

async function deleteJob(formData: FormData) {
  "use server";

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const { jobs } = getServerState();

  jobs.new.delete(id);

  await Effect.runPromise(
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

  type Job = React.ComponentProps<typeof JobsClient>["jobs"][string];
  type Service = React.ComponentProps<typeof JobsClient>["services"][string];

  const jobs = Object.fromEntries(
    Array.from(serverJobs.new.entries()).map(
      ([id, job]) =>
        [id, pick(job, ["id", "logs", "name", "path", "state"])] as [
          string,
          Job,
        ],
    ),
  );

  const services = Object.fromEntries(
    Array.from(serverServices.entries()).map(
      ([id, service]) =>
        [id, pick(service, ["id", "logs", "name", "state"])] as [
          string,
          Service,
        ],
    ),
  );

  return (
    <WebSocketProvider>
      <JobsClient
        {...{ cancelJob, deleteJob, initialLogLevels, jobs, services, t }}
      />
    </WebSocketProvider>
  );
}
