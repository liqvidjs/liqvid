import { Progress, type SingleBarOptions } from "@liqvid/renderer";
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

          constructor({ formatValue }: SingleBarOptions = {}) {
            const [barOptions, ...rest] = options;

            this.#bar = new cliProgress.SingleBar(
              {
                ...barOptions,
                // Only format the "value" and "total" fields; leave
                // percentage/eta/duration to cli-progress's own formatter.
                ...(formatValue
                  ? {
                      formatValue: (value, opts, type) =>
                        type === "value" || type === "total"
                          ? formatValue(value)
                          : cliProgress.Format.ValueFormat(value, opts, type),
                    }
                  : {}),
              },
              ...rest,
            );
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
