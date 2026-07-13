import {
  CheckCircleIcon,
  SpinnerIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Effect, Fiber } from "effect";

import { getServerState } from "../../initialize.mts";
import { Button } from "../../ui/Button.tsx";
import { Time } from "../../ui/Time.tsx";
import { getTranslations } from "../../utils/i18n.mts";

import styles from "./jobs.module.css";

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
}

export async function Jobs() {
  const t = await getTranslations<T>(import.meta.url);

  const { jobs } = getServerState();

  return (
    <main className={styles.main}>
      <h1>Jobs</h1>

      <ul>
        {Array.from(jobs.new.values()).map((job) => (
          <li className={styles.job} key={job.id}>
            <header className={styles.header}>
              {job.state === "cancelled" && (
                <XCircleIcon className={styles.cancelledIcon} weight="fill">
                  <title>{t.cancelled}</title>
                </XCircleIcon>
              )}
              {job.state === "completed" && (
                <CheckCircleIcon className={styles.completedIcon} weight="fill">
                  <title>{t.completed}</title>
                </CheckCircleIcon>
              )}
              {job.state === "running" && (
                <SpinnerIcon className={styles.runningIcon}>
                  <title>{t.running}</title>
                </SpinnerIcon>
              )}
              {job.state === "failed" && (
                <WarningCircleIcon className={styles.warningIcon} weight="fill">
                  <title>{t.failed}</title>
                </WarningCircleIcon>
              )}
              <pre>{job.path}</pre>
              &gt;
              <span>{job.name}</span>
              <form action={cancelJob}>
                <input name="id" type="hidden" value={job.id} />

                {job.state === "running" ? (
                  <Button formAction={cancelJob} type="submit">
                    {t.cancel}
                  </Button>
                ) : (
                  <Button formAction={deleteJob} type="submit">
                    {t.delete}
                  </Button>
                )}
              </form>
            </header>

            <ol className={styles.logGroup}>
              {job.logs.map((log, i) => {
                const msg =
                  log.message.length === 1 ? log.message[0] : log.message;

                return (
                  <li
                    className={styles.log}
                    data-level={log.type}
                    key={`${log.type}:${log.timestamp.toISOString()}:${i}`}
                  >
                    <Time
                      className={styles.timestamp}
                      format="date-and-time"
                      value={log.timestamp}
                    />
                    {log.annotations && (
                      <pre className={styles.annotations}>
                        {JSON.stringify(log.annotations)}
                      </pre>
                    )}
                    {(() => {
                      if (typeof msg === "string" || typeof msg === "number") {
                        return <pre className={styles.message}>{msg}</pre>;
                      }

                      if (isProgressEvent(msg)) {
                        return (
                          <div className={styles.progress}>
                            <progress max={msg.total} value={msg.value} />
                            {msg.value} / {msg.total}
                          </div>
                        );
                      }

                      return (
                        <pre className={styles.message}>
                          {JSON.stringify(msg, null, 2)}
                        </pre>
                      );
                    })()}
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ul>

      {/* <pre>{JSON.stringify(Array.from(jobs.captioning), null, 2)}</pre> */}
    </main>
  );
}

function isProgressEvent(msg: unknown): msg is {
  value: number;
  total: number;
} {
  return (
    typeof msg === "object" &&
    msg !== null &&
    "__kind" in msg &&
    msg.__kind === "progress"
  );
}
