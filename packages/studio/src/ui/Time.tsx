import type { DurationLike } from "@liqvid/duration";
import { formatTime, formatTimeDuration } from "@liqvid/utils";

import { toISODateString } from "../utils/time.mts";

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
  value,
  ...attrs
}: Omit<React.TimeHTMLAttributes<HTMLTimeElement>, "dateTime"> & {
  children?: React.ReactNode;
  value: DurationLike;
}) {
  return (
    <time
      dateTime={formatTimeDuration(value)}
      suppressHydrationWarning
      {...attrs}
    >
      {children ?? formatTime(value)}
    </time>
  );
}

/** Display a formatted time. */
export function Time({
  format = "long",
  locale = "en-US",
  value,
}: {
  format?: TimeFormat;
  locale?: Language;
  value: Date | number | string;
}) {
  if (!(value instanceof Date)) {
    value = new Date(value);
  }

  const serializer = serializers[format];
  const displayer = new Intl.DateTimeFormat(locale, displayers[format]).format;

  return (
    <time dateTime={serializer(value)} suppressHydrationWarning>
      {displayer(value)}
    </time>
  );
}
