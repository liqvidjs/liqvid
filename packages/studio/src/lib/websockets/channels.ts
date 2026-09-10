import { Schema } from "effect";

import { JobMessage } from "./channels/jobs.ts";
import { ProjectMessage } from "./channels/projects.ts";
import { RecordingMessage } from "./channels/recordings.ts";
import { ServiceMessage } from "./channels/services.ts";

/* ------------------------------ channel names ------------------------------ */
export const ChannelName = Schema.Literals([
  "jobs",
  "projects",
  "recordings",
  "services",
]);

export type ChannelName = (typeof ChannelName)["Type"];

/* ------------------------------ jobs ------------------------------ */

/* ------------------------------ projects ------------------------------ */

/* ------------------------------ channel registry ------------------------------ */
/**
 * Maps each channel name to the schema of the messages that flow over it.
 *
 * To add a message to a channel, add it to the union here; both the server
 * broadcast API and the client `useChannel` callbacks derive their types from
 * this registry.
 */
const ChannelMessages = {
  jobs: JobMessage,
  projects: ProjectMessage,
  recordings: RecordingMessage,
  services: ServiceMessage,
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
const Envelope = Schema.Struct({
  channel: ChannelName,
  message: Schema.Json,
});

// type Envelope = (typeof Envelope)["Type"];

/** JSON-string codec for the envelope, for encoding/decoding wire frames. */
export const EnvelopeFromJson = Schema.fromJsonString(Envelope);
