"use client";

import { Duration } from "@liqvid/duration";
import {
  CheckCircleIcon,
  SpinnerIcon,
  StopCircleIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { useCallback, useState } from "react";
import Cookies from "universal-cookie";

import type {
  LoggableJobClient,
  ServiceClient,
  StructuredLog,
  StructuredLogType,
} from "../../api/schemas.mts";
import { useChannel } from "../../components/WebSocketProvider.tsx";
import { LOG_LEVELS_COOKIE } from "../../cookies.ts";
import { Button } from "../../ui/Button.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/Tabs.tsx";
import { Time } from "../../ui/Time.tsx";
import { ToggleButton } from "../../ui/ToggleButton.tsx";

import styles from "./jobs.module.css";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

type Job = Pick<LoggableJobClient, "id" | "logs" | "name" | "path" | "state">;

type Service = Pick<ServiceClient, "id" | "logs" | "name" | "state">;

const LOG_LEVELS = ["error", "warn", "info", "log", "debug"] as const;

export const DEFAULT_LOG_LEVELS: LogLevel[] = ["error", "warn", "info", "log"];

type LogLevel = StructuredLogType;

const cookieOptions = {
  maxAge: Duration.inSeconds({ days: 365 }),
  path: "/",
  sameSite: "lax" as const,
};

/**
 * A single log entry delivered over WebSockets is JSON, so its `timestamp`
 * arrives as an ISO string. Revive it into a `Date` so the UI (which formats
 * timestamps) works the same as with the server-rendered logs.
 */
function reviveLog(log: StructuredLog): StructuredLog {
  return {
    ...log,
    timestamp:
      log.timestamp instanceof Date
        ? log.timestamp
        : new Date(log.timestamp as unknown as string),
  };
}

/**
 * Jobs/services delivered over WebSockets are JSON, so their `Date` fields
 * arrive as ISO strings. Revive them so the UI (which formats timestamps) works
 * the same as with the server-rendered entries.
 */
function reviveLogs<E extends { logs: readonly StructuredLog[] }>(entry: E): E {
  return {
    ...entry,
    logs: entry.logs.map(reviveLog),
  };
}

/** @package */
export function JobsClient({
  cancelJob,
  deleteJob,
  initialLogLevels,
  jobs: initialJobs,
  services: initialServices,
  t,
}: {
  cancelJob: (formData: FormData) => Promise<void>;
  deleteJob: (formData: FormData) => Promise<void>;
  initialLogLevels: string[];
  jobs: Record<string, Job>;
  services: Record<string, Service>;
  t: T;
}) {
  const [jobs, setJobs] = useState<Record<string, Job>>(initialJobs);
  const [services, setServices] =
    useState<Record<string, Service>>(initialServices);
  const [levels, setLevels] = useState<ReadonlySet<LogLevel>>(
    () => new Set(initialLogLevels as LogLevel[]),
  );

  const [annotations, setAnnotations] = useState<Record<
    string,
    unknown
  > | null>(null);

  const toggleLevel = (level: LogLevel) => {
    setLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      const cookies = new Cookies();
      cookies.set(LOG_LEVELS_COOKIE, JSON.stringify([...next]), cookieOptions);
      return next;
    });
  };

  const upsertJob = useCallback((job: Job) => {
    setJobs((prev) => ({ ...prev, [job.id]: reviveLogs(job) }));
  }, []);

  const upsertService = useCallback((service: Service) => {
    setServices((prev) => ({ ...prev, [service.id]: reviveLogs(service) }));
  }, []);

  const handleCancel = useCallback(
    (id: string) => {
      const formData = new FormData();
      formData.set("id", id);
      // Fire-and-forget: the job's state flips to "cancelled" via the WebSocket
      // `updateJob` message, so no page refresh is needed.
      void cancelJob(formData);
    },
    [cancelJob],
  );

  const handleDelete = useCallback(
    (id: string) => {
      // Optimistically remove the job so the list updates instantly without a
      // page refresh; restore it if the server action fails.
      let removed: Job | undefined;
      setJobs((prev) => {
        removed = prev[id];
        if (!removed) return prev;
        const { [id]: _removed, ...rest } = prev;
        return rest;
      });

      const formData = new FormData();
      formData.set("id", id);
      void deleteJob(formData).catch(() => {
        setJobs((prev) =>
          removed && !(id in prev) ? { ...prev, [id]: removed } : prev,
        );
      });
    },
    [deleteJob],
  );

  useChannel("jobs", {
    appendLog: ({ id, log }) => {
      setJobs((prev) => {
        const job = prev[id];
        if (!job) return prev;
        return {
          ...prev,
          [id]: { ...job, logs: [...job.logs, reviveLog(log)] },
        };
      });
    },

    deleteJob: ({ id }) => {
      setJobs((prev) => {
        if (!(id in prev)) return prev;
        const { [id]: _removed, ...rest } = prev;
        return rest;
      });
    },

    newJob: ({ job }) => {
      upsertJob(job);
    },

    updateJob: ({ job }) => {
      upsertJob(job);
    },
  });

  useChannel("services", {
    appendLog: ({ id, log }) => {
      setServices((prev) => {
        const service = prev[id];
        if (!service) return prev;
        return {
          ...prev,
          [id]: { ...service, logs: [...service.logs, reviveLog(log)] },
        };
      });
    },

    newService: ({ service }) => {
      upsertService(service);
    },

    updateService: ({ service }) => {
      upsertService(service);
    },
  });

  return (
    <main className={styles.main}>
      <h1>{t.title}</h1>

      <LogLevelFilter levels={levels} onToggle={toggleLevel} t={t} />

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">{t.tabJobs}</TabsTrigger>
          <TabsTrigger value="services">{t.tabServices}</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          <ul>
            {Object.values(jobs).map((job) => (
              <li className={styles.job} key={job.id}>
                <header className={styles.header}>
                  <JobStateIcon state={job.state} t={t} />
                  <pre>{job.path}</pre>
                  {">"}
                  <span>{job.name}</span>
                  {job.state === "running" ? (
                    <Button onClick={() => handleCancel(job.id)}>
                      {t.cancel}
                    </Button>
                  ) : (
                    <Button onClick={() => handleDelete(job.id)}>
                      {t.delete}
                    </Button>
                  )}
                </header>

                <LogGroup
                  levels={levels}
                  logs={job.logs}
                  onAnnotations={setAnnotations}
                />
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="services">
          <ul>
            {Object.values(services).map((service) => (
              <li className={styles.job} key={service.id}>
                <header className={styles.header}>
                  <ServiceStateIcon state={service.state} t={t} />
                  <span>{service.name}</span>
                </header>

                <LogGroup
                  levels={levels}
                  logs={service.logs}
                  onAnnotations={setAnnotations}
                />
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>

      {annotations && (
        <aside className={styles.annotations}>
          <MetadataTable data={annotations} />
        </aside>
      )}
    </main>
  );
}

function MetadataTable({ data }: { data: Record<string, unknown> }) {
  return (
    <table>
      <tbody>
        {Object.entries(data).map(([key, value]) => (
          <tr key={key}>
            <th>{key}</th>
            <td>
              <pre>
                {typeof value === "number" || typeof value === "string" ? (
                  <pre>{value}</pre>
                ) : typeof value === "object" && value !== null ? (
                  <MetadataTable data={value as Record<string, unknown>} />
                ) : (
                  <pre>{JSON.stringify(value)}</pre>
                )}
              </pre>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function JobStateIcon({ state, t }: { state: Job["state"]; t: T }) {
  switch (state) {
    case "cancelled":
      return (
        <XCircleIcon className={styles.cancelledIcon} weight="fill">
          <title>{t.cancelled}</title>
        </XCircleIcon>
      );
    case "completed":
      return (
        <CheckCircleIcon className={styles.completedIcon} weight="fill">
          <title>{t.completed}</title>
        </CheckCircleIcon>
      );
    case "running":
      return (
        <SpinnerIcon className={styles.runningIcon}>
          <title>{t.running}</title>
        </SpinnerIcon>
      );
    case "failed":
      return (
        <WarningCircleIcon className={styles.warningIcon} weight="fill">
          <title>{t.failed}</title>
        </WarningCircleIcon>
      );
  }
}

function ServiceStateIcon({ state, t }: { state: Service["state"]; t: T }) {
  switch (state) {
    case "running":
      return (
        <SpinnerIcon className={styles.runningIcon}>
          <title>{t.running}</title>
        </SpinnerIcon>
      );
    case "stopped":
      return (
        <StopCircleIcon className={styles.cancelledIcon} weight="fill">
          <title>{t.stopped}</title>
        </StopCircleIcon>
      );
    case "failed":
      return (
        <WarningCircleIcon className={styles.warningIcon} weight="fill">
          <title>{t.failed}</title>
        </WarningCircleIcon>
      );
  }
}

function LogGroup({
  levels,
  logs,
  onAnnotations,
}: {
  levels: ReadonlySet<LogLevel>;
  logs: readonly StructuredLog[];
  onAnnotations: (annotations: Record<string, unknown> | null) => void;
}) {
  return (
    <ol className={styles.logGroup}>
      {logs.map((log, i) => {
        if (!levels.has(log.type)) {
          return null;
        }

        const msg = log.message.length === 1 ? log.message[0] : log.message;

        return (
          <li
            className={styles.log}
            data-level={log.type}
            key={`${log.type}:${log.timestamp.toISOString()}:${i}`}
            onPointerEnter={() => onAnnotations(log.annotations)}
            onPointerLeave={() => onAnnotations(null)}
          >
            <Time
              className={styles.timestamp}
              format="date-and-time"
              value={log.timestamp}
            />
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
