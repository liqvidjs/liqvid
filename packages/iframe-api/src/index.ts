import type { z } from "zod";

/**
 * Declaration of a single API method with argument and return type schemas.
 */
export interface IFrameAPIMethodDeclaration<
  Args extends z.ZodTuple = z.ZodTuple,
  Return extends z.ZodType = z.ZodType,
> {
  /** Zod schema for the method arguments as a tuple */
  arguments: Args;

  /** Zod schema for the return type */
  return: Return;
}

/**
 * Declaration of an iframe API.
 */
export type IFrameAPIDeclaration = {
  /** Namespace for this API */
  namespace: string;

  methods: Record<string, IFrameAPIMethodDeclaration>;
};

/**
 * Extract the implementation type from an API declaration.
 * Maps each method to a function with the declared argument and return types.
 */
export type IFrameAPIImplementation<D extends IFrameAPIDeclaration> = {
  [K in keyof D["methods"]]: (
    ...args: z.infer<D["methods"][K]["arguments"]>
  ) =>
    | z.infer<D["methods"][K]["return"]>
    | Promise<z.infer<D["methods"][K]["return"]>>;
};

/**
 * Extract the client API type from an API declaration.
 * Maps each method to a function returning a Promise of the declared return type.
 */
export type IFrameAPIClient<D extends IFrameAPIDeclaration> = {
  [K in keyof D["methods"]]: (
    ...args: z.infer<D["methods"][K]["arguments"]>
  ) => Promise<z.infer<D["methods"][K]["return"]>>;
} & {
  destroy(): void;
};

/**
 * Message sent from parent to child to call a method.
 */
export interface CallMessage {
  type: "call";
  method: string;
  namespace: string;
  arguments: unknown[];
  requestId: number;
}

/**
 * Message sent from child to parent to acknowledge receipt of a call.
 */
export interface ReceivedMessage {
  namespace: string;
  type: "received";
  requestId: number;
}

/**
 * Message sent from child to parent with the return value.
 */
export interface ReturnMessage {
  namespace: string;
  type: "return";
  value: unknown;
  requestId: number;
}

/**
 * Message sent from child to parent when an error occurs.
 */
export interface ErrorMessage {
  namespace: string;
  type: "error";
  error: string;
  requestId: number;
}

/**
 * All message types used in iframe communication.
 */
export type IFrameMessage =
  | CallMessage
  | ReceivedMessage
  | ReturnMessage
  | ErrorMessage;
