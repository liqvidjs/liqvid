import { Schema } from "effect";

import { LoggableJob } from "../../api/schemas.mts";

/* ------------------------------ channel names ------------------------------ */
export const ChannelName = Schema.Literals(["jobs"]);

export type ChannelName = (typeof ChannelName)["Type"];

/* ------------------------------ messages ------------------------------ */
/** Message sent when a job is deleted */
export const DeleteJobMessage = Schema.Struct({
  data: Schema.Struct({
    /** ID of the job that was deleted */
    id: Schema.String,
  }),
  type: Schema.Literal("deleteJob"),
}).pipe(Schema.annotate({ description: "Message sent when a job is deleted" }));

export type DeleteJobMessage = (typeof DeleteJobMessage)["Type"];

/** Message sent when a new job is created */
export const NewJobMessage = Schema.Struct({
  data: Schema.Struct({
    job: Schema.Struct({
      name: Schema.String,
    }),
  }),
  type: Schema.Literal("newJob"),
}).pipe(
  Schema.annotate({ description: "Message sent when a new job is created" }),
);

export type NewJobMessage = (typeof NewJobMessage)["Type"];

export const UpdateJobMessage = Schema.Struct({
  data: Schema.Struct({
    job: LoggableJob,
  }),
  type: Schema.Literal("updateJob"),
}).pipe(Schema.annotate({ description: "Message sent when a job is updated" }));

export type UpdateJobMessage = (typeof UpdateJobMessage)["Type"];

/* ------------------------------ channel registry ------------------------------ */
/**
 * Maps each channel name to the schema of the messages that flow over it.
 *
 * To add a message to a channel, add it to the union here; both the server
 * broadcast API and the client `useChannel` callbacks derive their types from
 * this registry.
 */
export const ChannelMessages = {
  jobs: Schema.Union([DeleteJobMessage, NewJobMessage, UpdateJobMessage]),
} as const satisfies Record<ChannelName, Schema.Top>;

/**
 * The message union for a given channel.
 */
export type ChannelMessage<C extends ChannelName> =
  (typeof ChannelMessages)[C]["Type"];

/**
 * Maps each channel to a record of `{ [messageType]: payload }`, used to derive
 * the callback map accepted by `useChannel`. The payload is the message's
 * `data` field.
 */
export type Channels = {
  [C in ChannelName]: {
    [M in ChannelMessage<C> as M["type"]]: M["data"];
  };
};

/* ------------------------------ envelope ------------------------------ */
/**
 * Every frame on the wire is a JSON envelope tagging the message with its
 * channel, so the client can route it to the right subscribers.
 */
export const Envelope = Schema.Struct({
  channel: ChannelName,
  message: Schema.Unknown,
});

export type Envelope = (typeof Envelope)["Type"];

/** JSON-string codec for the envelope, for encoding/decoding wire frames. */
export const EnvelopeFromJson = Schema.fromJsonString(Envelope);
