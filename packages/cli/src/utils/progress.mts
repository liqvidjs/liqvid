import { Progress } from "@liqvid/renderer";
import cliProgress from "cli-progress";
import { Effect, Layer } from "effect";

export const cliProgressLayer = (
  ...options: ConstructorParameters<typeof cliProgress.SingleBar>
) =>
  Layer.effect(
    Progress,
    Effect.gen(function* () {
      return {
        SingleBar: class SingleBar {
          #bar: cliProgress.SingleBar;

          constructor() {
            this.#bar = new cliProgress.SingleBar(...options);
          }

          start(total: number, startValue: number) {
            this.#bar.start(total, startValue);
            this.#bar.increment();
          }

          increment(step?: number) {
            this.#bar.increment(step);
          }

          stop() {
            this.#bar.stop();
          }

          update(current: number) {
            this.#bar.update(current);
          }
        },
      };
    }),
  );

export const defaultCliProgressLayer = () =>
  cliProgressLayer(
    {
      autopadding: true,
      clearOnComplete: true,
      format: "{bar} {percentage}% | ETA: {eta_formatted} | {value}/{total}",
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic,
  );
