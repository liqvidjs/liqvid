import { getServerState } from "../../initialize.mts";
import { getTranslations } from "../../utils/i18n.mts";

import { UpdateBannerClient } from "./UpdateBanner.client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

/**
 * Server component that surfaces available updates for `liqvid` and
 * `@liqvid/studio`. Renders nothing when no updates are available (or the
 * initial check has not completed).
 */
export async function UpdateBanner() {
  const { updateInfo } = getServerState();

  if (!updateInfo || updateInfo.updates.length === 0) {
    return null;
  }

  const t = await getTranslations<T>(import.meta.url);

  return <UpdateBannerClient t={t} updates={updateInfo.updates} />;
}
