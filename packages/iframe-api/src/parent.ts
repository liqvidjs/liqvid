import type {
  CallMessage,
  ErrorMessage,
  IFrameAPIClient,
  IFrameAPIDeclaration,
  ReceivedMessage,
  ReturnMessage,
} from "./index.ts";

const DEFAULT_RETRY_INTERVAL = 100;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  received: boolean;
  retryTimer: ReturnType<typeof setInterval> | null;
  method: string;
  arguments: unknown[];
}

/**
 * Options for getIframeApi in the parent.
 */
export interface GetIframeApiOptions {
  /** Retry interval in milliseconds (default: 100) */
  retryInterval?: number;

  /** Target origin for postMessage (default: "*") */
  targetOrigin?: string;
}

/**
 * Get an iframe API client for communicating with a child iframe.
 *
 * @returns An object with methods matching the API declaration
 */
export function getIframeApi<D extends IFrameAPIDeclaration>(
  /** The API declaration */
  declaration: D,

  /** The iframe element to communicate with */
  iframe: HTMLIFrameElement,

  /** Configuration options */
  options: GetIframeApiOptions = {},
): IFrameAPIClient<D> {
  const { retryInterval = DEFAULT_RETRY_INTERVAL, targetOrigin = "*" } =
    options;

  let requestIdCounter = 0;
  const pendingRequests = new Map<number, PendingRequest>();

  const handleMessage = (event: MessageEvent) => {
    // Only accept messages from the iframe
    if (event.source !== iframe.contentWindow) return;

    const data = event.data as ReceivedMessage | ReturnMessage | ErrorMessage;
    if (!data || typeof data !== "object" || !("type" in data)) return;

    const pending = pendingRequests.get(data.requestId);
    if (!pending) return;

    switch (data.type) {
      case "received":
        // Stop retrying once acknowledged
        pending.received = true;
        if (pending.retryTimer) {
          clearInterval(pending.retryTimer);
          pending.retryTimer = null;
        }
        break;

      case "return":
        // Resolve the promise with the return value
        if (pending.retryTimer) {
          clearInterval(pending.retryTimer);
        }
        pendingRequests.delete(data.requestId);
        pending.resolve(data.value);
        break;

      case "error":
        // Reject the promise with the error
        if (pending.retryTimer) {
          clearInterval(pending.retryTimer);
        }
        pendingRequests.delete(data.requestId);
        pending.reject(new Error(data.error));
        break;
    }
  };

  window.addEventListener("message", handleMessage);

  const sendCall = (requestId: number, method: string, args: unknown[]) => {
    const message: CallMessage = {
      arguments: args,
      method,
      namespace: declaration.namespace,
      requestId,
      type: "call",
    };
    iframe.contentWindow?.postMessage(message, targetOrigin);
  };

  // Create the API object with methods for each declaration
  const api = {} as IFrameAPIClient<D> & { destroy: () => void };

  for (const method of Object.keys(declaration.methods)) {
    // biome-ignore lint/suspicious/noExplicitAny: dynamic method creation
    (api as any)[method] = (...args: unknown[]): Promise<unknown> => {
      return new Promise((resolve, reject) => {
        const requestId = ++requestIdCounter;

        const pending: PendingRequest = {
          arguments: args,
          method,
          received: false,
          reject,
          resolve,
          retryTimer: null,
        };

        pendingRequests.set(requestId, pending);

        // Send the initial call
        sendCall(requestId, method, args);

        // Set up retry interval
        pending.retryTimer = setInterval(() => {
          if (!pending.received) {
            sendCall(requestId, method, args);
          }
        }, retryInterval);
      });
    };
  }

  // Add destroy method to clean up
  api.destroy = () => {
    window.removeEventListener("message", handleMessage);
    // Clear all pending retry timers
    for (const pending of pendingRequests.values()) {
      if (pending.retryTimer) {
        clearInterval(pending.retryTimer);
      }
    }
    pendingRequests.clear();
  };

  return api;
}
