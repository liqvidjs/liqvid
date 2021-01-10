export const timeRegexp = /^(?:(?:(\d+):)?(\d+):)?(\d+)(?:\.(\d+))?$/;

export function parseTime(str: string) {
  const [h, m, s, ms] =
    str
    .match(timeRegexp)
    .slice(1)
    .map(x => x || "0");
  
  const [hours, minutes, seconds, milliseconds] = [h, m, s, ms.padEnd(3, "0")].map(x => parseInt(x, 10));
  
  return milliseconds + 1000 * (seconds + 60 * (minutes + 60 * hours));
}

export function formatTime(time: number): string {
  if (time < 0) {
    return "-" + formatTime(-time);
  }
  const minutes = Math.floor(time / 60 / 1000),
        seconds = Math.floor(time / 1000 % 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatTimeMs(time: number): string {
  if (time < 0) {
    return "-" + formatTimeMs(-time);
  }
  const milliseconds = Math.floor(time % 1000);

  return `${formatTime(time)}.${milliseconds}`;
}
