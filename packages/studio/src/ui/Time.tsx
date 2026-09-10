import type { DurationLike } from "@liqvid/duration";
import { formatTime, formatTimeDuration, formatTimeMs } from "@liqvid/utils";

import type { LocalizedReactNode } from "#_/i18n/shared.mjs";
import { asDate, toISODateString } from "#_/utils/time.mjs";

type TimeFormat = "long" | "date-and-time";
type Language = "en-US";

/** Format dates for the HTML {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time#valid_datetime_values datetime} attribute */
const serializers: Record<TimeFormat, (date: Date) => string> = {
  "date-and-time": (date) => date.toISOString(),
  long: toISODateString,
};

const displayers: Record<TimeFormat, Intl.DateTimeFormatOptions> = {
  "date-and-time": {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  },
  long: {
    dateStyle: "long",
  },
};

/** Display a formatted duration. */
export function TimeDuration({
  children,
  format = "seconds",
  value,
  ...attrs
}: Omit<React.TimeHTMLAttributes<HTMLTimeElement>, "dateTime"> & {
  children?: LocalizedReactNode;
  /**
   * Example values:
   * - `seconds`: 1:23
   * - `milliseconds`: 1:23.456
   */
  format?: "seconds" | "milliseconds";
  value: DurationLike;
}) {
  return (
    <time
      dateTime={formatTimeDuration(value)}
      suppressHydrationWarning
      {...attrs}
    >
      {children ??
        { milliseconds: formatTimeMs, seconds: formatTime }[format](value)}
    </time>
  );
}

/** Display a formatted time. */
export function Time({
  format = "long",
  locale = "en-US",
  value,
  ...props
}: {
  format?: TimeFormat;
  locale?: Language;
  value: Date | number | string;
} & Omit<React.ComponentProps<"time">, "dateTime">) {
  value = asDate(value);

  const serializer = serializers[format];
  const displayer = new Intl.DateTimeFormat(locale, displayers[format]).format;

  return (
    <time dateTime={serializer(value)} suppressHydrationWarning {...props}>
      {displayer(value)}
    </time>
  );
}
