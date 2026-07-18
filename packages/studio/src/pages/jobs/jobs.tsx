import { pick } from "@liqvid/utils";
import { Effect, Fiber } from "effect";

import { WebSocketProvider } from "../../components/WebSocketProvider.tsx";
import { getServerState } from "../../initialize.mts";
import { broadcast } from "../../next/websockets.mts";
import { getTranslations } from "../../utils/i18n.mts";

import { JobsClient } from "./jobs.client.tsx";

import type T from "./.translations/en.json";

type T = typeof T;

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
  const t = await getTranslations<T>(import.meta.url);

  const { jobs: serverJobs } = getServerState();

  type Job = React.ComponentProps<typeof JobsClient>["jobs"][string];

  const jobs = Object.fromEntries(
    Array.from(serverJobs.new.entries()).map(
      ([id, job]) =>
        [id, pick(job, ["id", "logs", "name", "path", "state"])] as [
          string,
          Job,
        ],
    ),
  );

  return (
    <WebSocketProvider>
      <JobsClient {...{ cancelJob, deleteJob, jobs, t }} />
    </WebSocketProvider>
  );
}
