import type {
  CallMessage,
  ErrorMessage,
  IFrameAPIDeclaration,
  IFrameAPIImplementation,
  ReceivedMessage,
  ReturnMessage,
} from "./index";

/**
 * Options for provideIframeApi in the child.
 */
export interface ProvideIframeApiOptions {
  /** Target origin for postMessage (default: "*") */
  targetOrigin?: string;
}

/**
 * Provide an iframe API implementation for the parent to call.
 * This should be called in the child iframe.
 *
 * @returns A cleanup function to remove the message listener
 */
export function provideIframeApi<D extends IFrameAPIDeclaration>(
  /** The API declaration */
  declaration: D,

  /** The implementation of each method */
  implementation: IFrameAPIImplementation<D>,

  /** Configuration options */
  options: ProvideIframeApiOptions = {},
): () => void {
  const { targetOrigin = "*" } = options;

  // Check if we're in an iframe
  if (typeof window === "undefined" || window.parent === window) {
    return () => {};
  }

  const handleMessage = async (event: MessageEvent) => {
    // Only accept messages from parent
    if (event.source !== window.parent) return;

    const data = event.data as CallMessage;
    if (
      !data ||
      typeof data !== "object" ||
      !("type" in data) ||
      data.type !== "call"
    ) {
      return;
    }

    const { method, arguments: args, requestId } = data;

    // Check if method exists in declaration
    if (!(method in declaration.methods)) {
      const errorMessage: ErrorMessage = {
        error: `Unknown method: ${method}`,
        namespace: declaration.namespace,
        requestId,
        type: "error",
      };
      window.parent.postMessage(errorMessage, targetOrigin);
      return;
    }

    // Send acknowledgment
    const receivedMessage: ReceivedMessage = {
      namespace: declaration.namespace,
      requestId,
      type: "received",
    };
    window.parent.postMessage(receivedMessage, targetOrigin);

    // Call the implementation
    try {
      const impl = implementation[method as keyof typeof implementation] as (
        ...args: unknown[]
      ) => unknown;
      const result = await impl(...args);

      // Send the return value
      const returnMessage: ReturnMessage = {
        namespace: declaration.namespace,
        requestId,
        type: "return",
        value: result,
      };
      window.parent.postMessage(returnMessage, targetOrigin);
    } catch (error) {
      // Send error message
      const errorMessage: ErrorMessage = {
        error: error instanceof Error ? error.message : String(error),
        namespace: declaration.namespace,
        requestId,
        type: "error",
      };
      window.parent.postMessage(errorMessage, targetOrigin);
    }
  };

  window.addEventListener("message", handleMessage);

  // Return cleanup function
  return () => {
    window.removeEventListener("message", handleMessage);
  };
}
