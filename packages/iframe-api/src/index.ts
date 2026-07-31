/**
 * Declaration of a single API method with argument and return types.
 *
 * These fields are purely type-level carriers: the runtime never reads their
 * values, only the method names. Declare them with a type assertion, e.g.
 * `arguments: [] as [duration: number]`.
 */
export interface IFrameAPIMethodDeclaration<
  Args extends readonly unknown[] = readonly unknown[],
  Return = unknown,
> {
  /** The method's argument types, as a tuple */
  arguments: Args;

  /** The method's return type */
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
    ...args: D["methods"][K]["arguments"]
  ) => D["methods"][K]["return"] | Promise<D["methods"][K]["return"]>;
};

/**
 * Extract the client API type from an API declaration.
 * Maps each method to a function returning a Promise of the declared return type.
 */
export type IFrameAPIClient<D extends IFrameAPIDeclaration> = {
  [K in keyof D["methods"]]: (
    ...args: D["methods"][K]["arguments"]
  ) => Promise<D["methods"][K]["return"]>;
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
