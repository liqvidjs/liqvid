import type { LiqvidConfig } from "@liqvid/schemas";
import { type LogLevel, Option } from "effect";

// export const LiqvidConfigService =
//   Context.Service<LiqvidConfig>("LiqvidConfig");

export function getLogLevel(
  config: Option.Option<LiqvidConfig>,
): LogLevel.LogLevel {
  const level = Option.flatMapNullishOr(
    config,
    (cfg) => cfg.logging?.level,
  ).pipe(Option.getOrElse(() => "info"));

  switch (level) {
    case "debug":
      return "All";
    default:
      return "Info";
  }
}
