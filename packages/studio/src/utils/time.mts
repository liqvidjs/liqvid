export type DateLike = Date | number | string;

export function asDate(date: DateLike) {
  if (date instanceof Date) {
    return date;
  }

  return new Date(date);
}

export function toISODateString(date: DateLike) {
  date = asDate(date);

  return date.toISOString().split("T")[0]!;
}
