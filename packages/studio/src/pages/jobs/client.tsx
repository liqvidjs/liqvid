"use client";

import { Duration } from "@liqvid/duration";
import { deserialize } from "@liqvid/ssr/serde";
import {
  ClosedCaptioningIcon,
  FilmStripIcon,
  ImagesIcon,
} from "@phosphor-icons/react";
import {
  CheckCircleIcon,
  SpinnerIcon,
  StopCircleIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import * as stylex from "@stylexjs/stylex";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import Cookies from "universal-cookie";

import type {
  LoggableJobClient,
  LoggableJobClientEncoded,
  ServiceClient,
  ServiceClientEncoded,
  StructuredLog,
  StructuredLogType,
} from "#_/api/schemas";
import { useChannel } from "#_/components/WebSocketProvider";
import { JOBS_TAB_COOKIE, LOG_LEVELS_COOKIE } from "#_/cookies";
import { colors, dims, rounded, spacing, text } from "#_/design/tokens.stylex";
import type { Localized } from "#_/i18n/shared";
import { Button } from "#_/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#_/ui/Tabs";
import { Time, TimeDuration } from "#_/ui/Time";
import { ToggleButton } from "#_/ui/ToggleButton";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

const spin = stylex.keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
  annotations: {
    alignItems: "flex-start",
    borderRadius: rounded.md,
    bottom: "1em",
    boxShadow: `0 0 0 1px ${colors.graySep}`,
    display: "flex",
    fontSize: text.md,
    padding: spacing.sm,
    position: "fixed",
    right: "1em",
    verticalAlign: "top",
  },

  cancelledIcon: {
    fill: "grey",
  },

  completedIcon: {
    fill: colors.successSolid,
  },

  filter: {
    alignItems: "center",
    display: "flex",
    gap: spacing.xs,
    marginBlock: spacing.sm,
    marginInline: spacing.zero,
  },

  filterActive: {
    background: {
      ":hover": "var(--accent-ui)",
      default: "var(--accent-ui)",
    },
    borderBottomColor: colors.accentSolid,
    color: colors.accentSolid,
  },

  filterButton: {
    background: {
      ":hover": colors.grayHover,
      default: "transparent",
    },
    borderBottomColor: colors.transparent,
    borderBottomLeftRadius: rounded.none,
    borderBottomRightRadius: rounded.none,
    borderBottomStyle: "solid",
    borderBottomWidth: spacing.sm,
    borderStyle: "none",
    borderTopLeftRadius: rounded.md,
    borderTopRightRadius: rounded.md,
    color: colors.grayNormal,
    cursor: "pointer",
    fontSize: text.base,
    outlineColor: colors.accentSolid,
    outlineOffset: {
      ":focus-visible": "1px",
      default: null,
    },
    outlineStyle: {
      ":focus-visible": "solid",

      default: null,
    },
    outlineWidth: dims.ring,
    padding: `${spacing.xs} 0.6rem`,
    transition: "background-color 0.15s, color 0.15s, border-color 0.15s",
  },

  header: {
    alignItems: "center",
    columnGap: spacing.sm,
    display: "flex",
    rowGap: spacing.sm,
  },

  job: {
    marginBlock: spacing.sm,
    marginInline: spacing.zero,
  },

  log: {
    backgroundColor: colors.grayApp,
    paddingBlock: spacing.sm,
    paddingInline: spacing.sm,
    position: "relative",
    scrollbarWidth: "thin",
    width: "100%",
  },

  logDebug: {
    color: colors.logDebug,
  },

  logError: {
    color: colors.errorText,
  },

  logGroup: {
    borderColor: colors.graySep,
    borderRadius: rounded.sm,
    borderStyle: "solid",
    borderWidth: dims.sep,
    fontSize: text.md,
  },
  main: {
    marginBlock: spacing.zero,
    marginInline: spacing.auto,
    width: "75%",
  },

  message: {
    whiteSpace: "pre-wrap",
  },

  pathParam: {
    backgroundColor: colors.accentSolid,
    borderRadius: rounded.sm,
    color: colors.white,
    paddingInline: spacing.xs,
  },

  progress: {
    alignItems: "center",
    columnGap: spacing.lg,
    display: "flex",
    rowGap: spacing.lg,
  },

  runningIcon: {
    animationDuration: "2s",
    animationIterationCount: "infinite",
    animationName: spin,
    animationTimingFunction: "linear",
    fill: colors.accentSolid,
  },

  timestamp: {
    backgroundColor: colors.grayApp,
    borderBottomLeftRadius: rounded.sm,
    borderBottomRightRadius: rounded.none,
    borderBottomStyle: "solid",
    borderColor: colors.graySep,
    borderLeftStyle: "solid",
    borderRightStyle: "none",
    borderStyle: "solid",
    borderTopLeftRadius: rounded.none,
    borderTopRightRadius: rounded.none,
    borderTopStyle: "none",
    borderWidth: dims.sep,
    color: colors.grayDim,
    flexShrink: 0,
    fontSize: text.md,
    opacity: 0,
    paddingBlock: spacing.xs,
    paddingInline: spacing.md,
    position: "absolute",
    right: 0,
    top: 0,
    transition: "opacity 150ms ease-in-out",
  },

  timestampVisible: {
    opacity: 1,
  },

  warningIcon: {
    fill: colors.errorText,
  },
});

const LOG_LEVELS = ["error", "warn", "info", "log", "debug"] as const;

export const DEFAULT_LOG_LEVELS: LogLevel[] = ["error", "warn", "info", "log"];

type LogLevel = StructuredLogType;

function JobPath({ params, path }: Pick<LoggableJobClient, "params" | "path">) {
  return (
    <pre>
      {path?.split(/(\[[^\]]+\])/g).map((part, index) => {
        const match = /^\[([^\]]+)\]$/.exec(part);
        const value = match ? params?.[match[1]!] : undefined;

        return value === undefined ? (
          part
        ) : (
          <span key={index} sx={styles.pathParam} title={part}>
            {value}
          </span>
        );
      })}
    </pre>
  );
}

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

type TabValue = "jobs" | "services";

type MetaState = {
  readonly annotations: Record<string, unknown>;
  readonly spans: readonly (readonly [string, number])[];
};

type JobsState = {
  activeTab: TabValue;
  jobs: Record<string, LoggableJobClient>;
  levels: ReadonlySet<LogLevel>;
  meta: MetaState | null;
  services: Record<string, ServiceClient>;
};

type JobsAction =
  | { id: string; kind: "appendJobLog"; log: StructuredLog }
  | { id: string; kind: "appendServiceLog"; log: StructuredLog }
  | { id: string; kind: "deleteJob" }
  | { job: LoggableJobClient; kind: "jobRestore" }
  | { kind: "levels"; value: ReadonlySet<LogLevel> }
  | { kind: "meta"; value: MetaState | null }
  | { kind: "tab"; value: TabValue }
  | { job: LoggableJobClient; kind: "upsertJob" }
  | { service: ServiceClient; kind: "upsertService" };

function jobsReducer(state: JobsState, action: JobsAction): JobsState {
  switch (action.kind) {
    case "appendJobLog": {
      const job = state.jobs[action.id];
      if (!job) {
        return state;
      }
      return {
        ...state,
        jobs: {
          ...state.jobs,
          [action.id]: { ...job, logs: [...job.logs, action.log] },
        },
      };
    }
    case "appendServiceLog": {
      const service = state.services[action.id];
      if (!service) {
        return state;
      }
      return {
        ...state,
        services: {
          ...state.services,
          [action.id]: {
            ...service,
            logs: [...service.logs, reviveLog(action.log)],
          },
        },
      };
    }
    case "deleteJob": {
      if (!(action.id in state.jobs)) {
        return state;
      }
      const jobs = { ...state.jobs };
      delete jobs[action.id];
      return { ...state, jobs };
    }
    case "jobRestore": {
      if (action.job.id in state.jobs) {
        return state;
      }
      return {
        ...state,
        jobs: { ...state.jobs, [action.job.id]: action.job },
      };
    }
    case "levels": {
      return { ...state, levels: action.value };
    }
    case "meta": {
      return { ...state, meta: action.value };
    }
    case "tab": {
      return { ...state, activeTab: action.value };
    }
    case "upsertJob": {
      return {
        ...state,
        jobs: { ...state.jobs, [action.job.id]: action.job },
      };
    }
    case "upsertService": {
      return {
        ...state,
        services: { ...state.services, [action.service.id]: action.service },
      };
    }
  }
}

/** @package */
export function JobsClient({
  cancelJob,
  deleteJob,
  initialLogLevels,
  initialTab,
  jobs: initialJobs,
  services: initialServices,
  t,
}: {
  cancelJob: (formData: FormData) => Promise<void>;
  deleteJob: (formData: FormData) => Promise<void>;
  initialLogLevels: readonly string[];
  initialTab: TabValue;
  jobs: Readonly<Record<string, LoggableJobClientEncoded>>;
  services: Readonly<Record<string, ServiceClientEncoded>>;
  t: T;
}) {
  const [state, dispatch] = useReducer(
    jobsReducer,
    {
      initialJobs,
      initialLogLevels,
      initialServices,
      initialTab,
    },
    ({
      initialJobs,
      initialLogLevels,
      initialServices,
      initialTab,
    }): JobsState => ({
      activeTab: initialTab,
      jobs: deserialize(initialJobs, {
        "@liqvid/duration": Duration.fromJSON,
      }),
      levels: new Set(initialLogLevels as LogLevel[]),
      meta: null,
      services: deserialize(initialServices, {
        "@liqvid/duration": Duration.fromJSON,
      }),
    }),
  );
  const { activeTab, jobs, levels, meta, services } = state;

  const toggleLevel = (level: LogLevel) => {
    const next = new Set(levels);
    if (next.has(level)) {
      next.delete(level);
    } else {
      next.add(level);
    }
    dispatch({ kind: "levels", value: next });

    const cookies = new Cookies();
    cookies.set(LOG_LEVELS_COOKIE, JSON.stringify([...next]), cookieOptions);
  };

  const handleTabChange = (value: TabValue) => {
    dispatch({ kind: "tab", value });
    const cookies = new Cookies();
    cookies.set(JOBS_TAB_COOKIE, value, cookieOptions);
  };

  const upsertJob = useCallback((job: LoggableJobClient) => {
    dispatch({ job, kind: "upsertJob" });
  }, []);

  const upsertService = useCallback((service: ServiceClient) => {
    dispatch({ kind: "upsertService", service });
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
      const removed = jobs[id];
      if (!removed) {
        return;
      }
      dispatch({ id, kind: "deleteJob" });

      const formData = new FormData();
      formData.set("id", id);
      void deleteJob(formData).catch(() => {
        dispatch({ job: removed, kind: "jobRestore" });
      });
    },
    [deleteJob, jobs],
  );

  useChannel(
    "jobs",
    useMemo(
      () => ({
        appendLog: ({ id, log }) => {
          dispatch({ id, kind: "appendJobLog", log });
        },

        deleteJob: ({ id }) => {
          dispatch({ id, kind: "deleteJob" });
        },

        newJob: ({ job }) => {
          upsertJob(job);
        },

        updateJob: ({ job }) => {
          upsertJob(job);
        },
      }),
      [upsertJob],
    ),
  );

  useChannel(
    "services",
    useMemo(
      () => ({
        appendLog: ({ id, log }) => {
          dispatch({ id, kind: "appendServiceLog", log });
        },

        newService: ({ service }) => {
          upsertService(service);
        },

        updateService: ({ service }) => {
          upsertService(service);
        },
      }),
      [upsertService],
    ),
  );

  useEffect(() => {
    if (window.location.hash) {
      dispatch({ kind: "tab", value: "jobs" });
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "jobs") {
      return;
    }
    const id = window.location.hash.slice(1);
    if (!id || !jobs[id]) {
      return;
    }
    document.getElementById(id)?.scrollIntoView();
  }, [activeTab, jobs]);

  return (
    <main sx={styles.main}>
      <h1>{t.title}</h1>

      <LogLevelFilter levels={levels} onToggle={toggleLevel} t={t} />

      <Tabs
        onValueChange={(v) => handleTabChange(v as TabValue)}
        value={activeTab}
      >
        <TabsList>
          <TabsTrigger value="jobs">{t.tabJobs}</TabsTrigger>
          <TabsTrigger value="services">{t.tabServices}</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          <ul>
            {Object.values(jobs).map((job) => (
              <li id={job.id} key={job.id} sx={styles.job}>
                <header sx={styles.header}>
                  <JobStateIcon state={job.state} t={t} />
                  <JobKindIcon
                    // TODO: fix this
                    kind={job.name.slice(0, job.name.indexOf(":")) as JobKind}
                    t={t}
                  />
                  <JobPath params={job.params} path={job.path} />
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
                  onAnnotations={(value) => dispatch({ kind: "meta", value })}
                />
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="services">
          <ul>
            {Object.values(services).map((service) => (
              <li key={service.id} sx={styles.job}>
                <header sx={styles.header}>
                  <ServiceStateIcon state={service.state} t={t} />
                  <span>{service.name}</span>
                </header>

                <LogGroup
                  levels={levels}
                  logs={service.logs}
                  onAnnotations={(value) => dispatch({ kind: "meta", value })}
                />
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>

      {meta && (
        <aside sx={styles.annotations}>
          <MetadataTable data={meta.annotations} />
          <table>
            <tbody>
              {meta.spans.map(([name, duration], i) => (
                <tr key={i}>
                  <th>{name}</th>
                  <td>
                    <TimeDuration value={{ milliseconds: duration }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </aside>
      )}
    </main>
  );
}

function MetadataTable({ data }: { data: Readonly<Record<string, unknown>> }) {
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

function JobStateIcon({
  state,
  t,
}: {
  state: LoggableJobClient["state"];
  t: T;
}) {
  switch (state) {
    case "cancelled":
      return (
        <XCircleIcon {...stylex.props(styles.cancelledIcon)} weight="fill">
          <title>{t.cancelled}</title>
        </XCircleIcon>
      );
    case "completed":
      return (
        <CheckCircleIcon {...stylex.props(styles.completedIcon)} weight="fill">
          <title>{t.completed}</title>
        </CheckCircleIcon>
      );
    case "running":
      return (
        <SpinnerIcon {...stylex.props(styles.runningIcon)}>
          <title>{t.running}</title>
        </SpinnerIcon>
      );
    case "failed":
      return (
        <WarningCircleIcon {...stylex.props(styles.warningIcon)} weight="fill">
          <title>{t.failed}</title>
        </WarningCircleIcon>
      );
  }
}

type JobKind = "captions" | "render" | "thumbnails";

function JobKindIcon({ kind, t }: { kind: JobKind; t: T }) {
  switch (kind) {
    case "captions":
      return (
        <ClosedCaptioningIcon>
          <title>{t.kinds.captions}</title>
        </ClosedCaptioningIcon>
      );
    case "render":
      return (
        <FilmStripIcon>
          <title>{t.kinds.render}</title>
        </FilmStripIcon>
      );
    case "thumbnails":
      return (
        <ImagesIcon>
          <title>{t.kinds.thumbnails}</title>
        </ImagesIcon>
      );
  }
}

function ServiceStateIcon({
  state,
  t,
}: {
  state: ServiceClient["state"];
  t: T;
}) {
  switch (state) {
    case "running":
      return (
        <SpinnerIcon {...stylex.props(styles.runningIcon)}>
          <title>{t.running}</title>
        </SpinnerIcon>
      );
    case "stopped":
      return (
        <StopCircleIcon {...stylex.props(styles.cancelledIcon)} weight="fill">
          <title>{t.stopped}</title>
        </StopCircleIcon>
      );
    case "failed":
      return (
        <WarningCircleIcon {...stylex.props(styles.warningIcon)} weight="fill">
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
  onAnnotations: (annotations: MetaState | null) => void;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <ol sx={styles.logGroup}>
      {logs.map((log, i) => {
        if (!levels.has(log.type)) {
          return null;
        }

        const msg = log.message.length === 1 ? log.message[0] : log.message;

        return (
          <li
            key={`${log.type}:${log.timestamp.toISOString()}:${i}`}
            onPointerEnter={() => {
              setHoveredIdx(i);
              onAnnotations({
                annotations: log.annotations,
                spans: log.spans,
              });
            }}
            onPointerLeave={() => {
              setHoveredIdx(null);
              onAnnotations(null);
            }}
            sx={[
              styles.log,
              log.type === "error" && styles.logError,
              log.type === "debug" && styles.logDebug,
            ]}
          >
            <Time
              {...stylex.props(
                styles.timestamp,
                hoveredIdx === i && styles.timestampVisible,
              )}
              format="date-and-time"
              value={log.timestamp}
            />
            {(() => {
              if (typeof msg === "string" || typeof msg === "number") {
                return <pre sx={styles.message}>{msg}</pre>;
              }

              if (isProgressEvent(msg)) {
                return (
                  <div sx={styles.progress}>
                    <progress max={msg.total} value={msg.value} />
                    {msg.scheme
                      ? `${msg.scheme} ${msg.formattedValue}/${msg.formattedTotal}`
                      : `${msg.formattedValue} / ${msg.formattedTotal}`}
                  </div>
                );
              }

              return (
                <pre sx={styles.message}>{JSON.stringify(msg, null, 2)}</pre>
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
    <div sx={styles.filter}>
      {LOG_LEVELS.map((level) => {
        const active = levels.has(level);
        return (
          <ToggleButton
            aria-pressed={active}
            {...stylex.props(
              styles.filterButton,
              active && styles.filterActive,
            )}
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

type JobProgressEvent = Readonly<{
  value: number;
  total: number;
  formattedValue: string;
  formattedTotal: string;
  scheme?: string;
}>;

function isProgressEvent(msg: unknown): msg is JobProgressEvent {
  return (
    typeof msg === "object" &&
    msg !== null &&
    "__kind" in msg &&
    msg.__kind === "progress"
  );
}
