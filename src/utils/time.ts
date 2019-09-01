// parse time
export function parseTime(str: string) {
  let [h, m, s, ms] =
    str
    .match(/^(?:(?:(\d+):)?(\d+):)?(\d+)(?:\.(\d+))?$/)
    .slice(1)
    .map(x => x || "0");

  ms = ms.padEnd(3, "0");
  const [hours, minutes, seconds, milliseconds] = [h, m, s, ms].map(x => parseInt(x, 10));
  
  return milliseconds + 1000 * (seconds + 60 * (minutes + 60 * hours));
}

export function formatTime(time: number) {
  const minutes = Math.floor(time / 60 / 1000),
        seconds = Math.floor(time / 1000 % 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatTimeMs(time: number) {
  const milliseconds = Math.floor(time % 1000),
        minutes = Math.floor(time / 60 / 1000),
        seconds = Math.floor(time / 1000 % 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}.${milliseconds}`;
}
