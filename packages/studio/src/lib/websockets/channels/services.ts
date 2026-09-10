import { Schema } from "effect";

import { ServiceClient, StructuredLog } from "#_/api/schemas.mjs";

/** Message sent when a new service is started */
const NewServiceMessage = Schema.Struct({
  data: Schema.Struct({
    service: ServiceClient,
  }),
  type: Schema.Literal("newService"),
}).pipe(
  Schema.annotate({
    description: "Message sent when a new service is started",
  }),
);

// type NewServiceMessage = (typeof NewServiceMessage)["Type"];

/**
 * Message sent when a service's state changes (e.g. it fails or is stopped).
 */
const UpdateServiceMessage = Schema.Struct({
  data: Schema.Struct({
    service: ServiceClient,
  }),
  type: Schema.Literal("updateService"),
}).pipe(
  Schema.annotate({ description: "Message sent when a service is updated" }),
);

// type UpdateServiceMessage = (typeof UpdateServiceMessage)["Type"];

/**
 * Message sent when a new log entry is appended to a running service.
 * Streaming individual entries (rather than the whole service) keeps real-time
 * log updates cheap for verbose services.
 */
const AppendServiceLogMessage = Schema.Struct({
  data: Schema.Struct({
    /** ID of the service the log belongs to */
    id: Schema.String,

    /** The newly appended log entry */
    log: StructuredLog,
  }),
  type: Schema.Literal("appendLog"),
}).pipe(
  Schema.annotate({
    description: "Message sent when a service log is appended",
  }),
);

// type AppendServiceLogMessage = (typeof AppendServiceLogMessage)["Type"];

/* ------------------------------ export ------------------------------ */
export const ServiceMessage = Schema.Union([
  AppendServiceLogMessage,
  NewServiceMessage,
  UpdateServiceMessage,
]);

export type ServiceMessage = (typeof ServiceMessage)["Type"];
