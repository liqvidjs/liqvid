"use client";

import {
  CheckCircleIcon,
  SpinnerIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { useState } from "react";

import type { LoggableJob, StructuredLogType } from "../../api/schemas.mts";
import { useChannel } from "../../components/WebSocketProvider.tsx";
import { Button } from "../../ui/Button.tsx";
import { Time } from "../../ui/Time.tsx";
import { ToggleButton } from "../../ui/ToggleButton.tsx";

import styles from "./jobs.module.css";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

type Job = Pick<LoggableJob, "id" | "logs" | "name" | "path" | "state">;

const LOG_LEVELS = ["error", "warn", "info", "log", "debug"] as const;

type LogLevel = StructuredLogType;

/** @package */
export function JobsClient({
  cancelJob,
  deleteJob,
  jobs,
  t,
}: {
  cancelJob: (formData: FormData) => Promise<void>;
  deleteJob: (formData: FormData) => Promise<void>;
  jobs: Record<string, Job>;
  t: T;
}) {
  const [levels, setLevels] = useState<ReadonlySet<LogLevel>>(
    () => new Set(LOG_LEVELS),
  );

  const toggleLevel = (level: LogLevel) => {
    setLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  // TODO: websockets
  useChannel("jobs", {
    deleteJob: ({ id }) => {
      id;
    },

    newJob: ({ job }) => {
      job;
    },

    updateJob: ({ job }) => {
      job;
    },
  });
  return (
    <main className={styles.main}>
      <h1>{t.title}</h1>

      <LogLevelFilter levels={levels} onToggle={toggleLevel} t={t} />

      <ul>
        {Object.values(jobs).map((job) => (
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
              {">"}
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
                if (!levels.has(log.type)) {
                  return null;
                }

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
                            {`${msg.formattedValue} / ${msg.formattedTotal}`}
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

function LogLevelFilter({
  levels,
  onToggle,
  t,
}: {
  levels: ReadonlySet<LogLevel>;
  onToggle: (level: LogLevel) => void;
  t: T;
}) {
  const labels: Record<LogLevel, string> = {
    debug: t.levelDebug,
    error: t.levelError,
    info: t.levelInfo,
    log: t.levelLog,
    warn: t.levelWarn,
  };

  return (
    <div className={styles.filter}>
      {LOG_LEVELS.map((level) => {
        const active = levels.has(level);
        return (
          <ToggleButton
            aria-pressed={active}
            className={clsx(styles.filterButton, active && styles.filterActive)}
            key={level}
            onClick={() => onToggle(level)}
          >
            {labels[level]}
          </ToggleButton>
        );
      })}
    </div>
  );
}

function isProgressEvent(msg: unknown): msg is {
  value: number;
  total: number;
  formattedValue: string;
  formattedTotal: string;
} {
  return (
    typeof msg === "object" &&
    msg !== null &&
    "__kind" in msg &&
    msg.__kind === "progress"
  );
}
