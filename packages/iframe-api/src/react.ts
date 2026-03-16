import { useEffect, useState } from "react";

import type { IFrameAPIClient, IFrameAPIDeclaration } from "./index";
import { type GetIframeApiOptions, getIframeApi } from "./parent";

export function useIframeApi<D extends IFrameAPIDeclaration>(
  decl: D,
  options?: GetIframeApiOptions,
): {
  api: IFrameAPIClient<D> | null;
  ref: React.RefCallback<HTMLIFrameElement>;
} {
  const [api, setApi] = useState<IFrameAPIClient<D> | null>(null);
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!iframe) return;

    const api = getIframeApi(decl, iframe, {
      retryInterval: options?.retryInterval,
      targetOrigin: options?.targetOrigin,
    });

    setApi(api);

    return () => {
      api.destroy();
      setApi(null);
    };
  }, [iframe, decl, options?.retryInterval, options?.targetOrigin]);

  return { api, ref: setIframe };
}
