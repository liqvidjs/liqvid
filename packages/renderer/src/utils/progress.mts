import { Context } from "effect";

/**
 * Options for constructing a {@link Progress} `SingleBar`.
 */
export interface SingleBarOptions {
  etaBuffer?: number;
  /**
   * Format a raw progress value (e.g. `value` or `total`) for display.
   * Defaults to the value's own string representation.
   */
  formatValue?: (value: number) => string;
}

// Declaring a tag for a service that generates random numbers
export const Progress = Context.Service<{
  SingleBar: {
    new (
      options?: SingleBarOptions,
    ): {
      /** Increases the current progress value by a specified amount (default +1). Update payload optionally */
      increment(step?: number): void;

      /** Starts the progress bar and set the total and initial value */
      start(total: number, start: number): void;

      /** Stops the progress bar and go to next line */
      stop(): void;

      /** Sets the current progress value */
      update(current: number): void;
    };
  };
}>("Progress");
