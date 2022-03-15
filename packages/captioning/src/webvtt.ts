import {Transcript} from "./transcription";

/**
 * Convert rich {@link Transcript} to WebVTT string
 * @param transcript Transcript
 * @returns WebVTT file as string
 */
export function toWebVTT(transcript: Transcript) {
  const captions = ["WEBVTT", ""];

  for (let i = 0; i < transcript.length; ++i) {
    const line = transcript[i];
    if (line.length === 0)
      continue;
    captions.push(String(i+1));
    captions.push(formatTimeMs(line[0][1]) + " --> " + formatTimeMs(line[line.length - 1][2]));
    captions.push(line.map(_ => _[0]).join(" "));
    captions.push("");
  }
  
  return captions.join("\n");
}

/* WebVTT requires mm:ss whereas @liqvid/utils/time produces [m]m:ss */
function formatTime(time: number): string {
  if (time < 0) {
    return "-" + formatTime(-time);
  }
  const minutes = Math.floor(time / 60 / 1000),
        seconds = Math.floor(time / 1000 % 60);

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function formatTimeMs(time: number): string {
  if (time < 0) {
    return "-" + formatTimeMs(-time);
  }
  const milliseconds = Math.floor(time % 1000);

  return `${formatTime(time)}.${milliseconds.toString().padStart(3, "0")}`;
}
