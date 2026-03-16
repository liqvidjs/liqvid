import { providersMap } from "./providers/index.mts";
import { LiqvidConfig } from "./schemas/liqvid-config.mts";
import { loadJson } from "./utils/fs.mts";

// Example Usage (Demonstration - NOT production ready)
async function main() {
  // load config file
  const configFileName = "./liqvid.config.json";
  const $config = await loadJson(LiqvidConfig, configFileName);

  if (!$config.isOk) {
    console.error("failed to parse config file", $config.unwrapErr());
    process.exit(1);
  }
  const config = $config.unwrap();

  // initialize providers
  const contentProviderConfig = config.providers[config.backend.content];
  if (!contentProviderConfig) {
    throw new Error(
      `missing configuration for content provider "${config.backend.content}"`,
    );
  }
  const contentProvider = new providersMap[config.backend.content](
    contentProviderConfig as any,
  );

  // const mediaProviderConfig = config.providers[config.backend.media];
  // if (!mediaProviderConfig) {
  //   throw new Error(
  //     `missing configuration for media provider "${config.backend.media}"`,
  //   );
  // }
  // const _mediaProvider = new providersMap[config.backend.media](
  //   mediaProviderConfig as any,
  // );

  try {
    await contentProvider.publishContent("./build/client");
    console.log("Directory synchronization completed successfully!");
  } catch (error) {
    console.error("Directory synchronization failed:", error);
  }
}

main();
