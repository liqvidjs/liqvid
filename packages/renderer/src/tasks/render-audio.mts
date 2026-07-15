import { promises as fsp } from "node:fs";
import * as path from "node:path";

import { Effect } from "effect";

import { getEnsureChrome } from "../utils/binaries.mts";
import { connect } from "../utils/connect.mts";
import { acquireBrowser } from "../utils/effect.mts";

export interface RenderAudioOptions {
  /** Path to Chrome/ium executable */
  browserExecutable?: string;

  /** Output path for the WAV file */
  output: string;

  /** URL of the Liqvid player */
  url: string;

  /**
   * Number of channels to use
   * @default 1
   */
  channels?: number;

  /**
   * Sample rate
   * @default 16000
   */
  sampleRate?: number;
}

export interface RenderAudioResult {
  /** Duration of the rendered audio in seconds */
  duration: number;

  /** Path to the saved WAV file */
  path: string;
}

/**
 * Render the audio track of a Liqvid video to a WAV file.
 *
 * Connects to the player with a headless browser, renders all registered
 * audio sources offline using an {@link OfflineAudioContext}, and saves
 * the result as a WAV file.
 */
export function renderAudio({
  browserExecutable,
  channels = 1,
  sampleRate = 16_000,
  output,
  url,
}: RenderAudioOptions) {
  return Effect.gen(function* () {
    // Find browser executable
    const executablePath = yield* Effect.promise(() =>
      getEnsureChrome(browserExecutable ?? ""),
    );

    // Launch browser
    const browser = yield* acquireBrowser({
      args: [process.platform === "linux" ? "--single-process" : ""].filter(
        Boolean,
      ) as string[],
      executablePath,
      headless: process.env.HEADLESS !== "false",
      timeout: 0,
    });

    // Connect to the page
    const page = yield* connect({
      browser,
      height: 0,
      renderMode: "video",
      url,
      width: 0,
    });

    yield* Effect.promise(async () => {
      // send Escape key to page --- can't load audioContext without user input
      await page.keyboard.press("Escape");

      await page.waitForFunction(
        () =>
          player.playback.audioContext && player.playback.audioSources.size > 0,
      );
    });

    yield* Effect.logDebug("got audio sources");

    const { duration } = yield* Effect.promise(async () => {
      // Render the audio inside the page
      const { base64, duration } = await page.evaluate(renderOfflineInPage, {
        channels,
        sampleRate,
      });

      // Ensure output directory exists
      await fsp.mkdir(path.dirname(output), { recursive: true });

      // Save the WAV file
      await fsp.writeFile(output, base64, "base64");

      return { duration };
    });

    yield* Effect.logDebug("done!");

    return {
      duration,
      path: output,
    };
  }).pipe(
    Effect.annotateLogs({ channels, output, sampleRate, url }),
    Effect.scoped,
  );
}

/**
 * Render all registered audio sources to a WAV file.
 *
 * This function is serialized and executed inside the browser page,
 * so it must be entirely self-contained.
 */
async function renderOfflineInPage({
  channels = 1,
  sampleRate = 16_000,
}: {
  /**
   * Number of channels to use
   * @default 1
   */
  channels?: number;

  /**
   * Sample rate
   * @default 16000
   */
  sampleRate?: number;
} = {}): Promise<{
  base64: string;

  duration: number;
}> {
  const playback = player.playback;
  const duration = playback.duration;

  // Wait for audio sources to finish registering (decoding is async).
  // Proceed once the set of sources has been stable for 500ms.
  await new Promise<void>((resolve) => {
    const TIMEOUT = 10_000;
    const STABLE_FOR = 500;
    const start = performance.now();
    let lastSize = playback.audioSources.size;
    let lastChange = start;

    const POLLING_INTERVAL = 50;
    const poll = setInterval(() => {
      const now = performance.now();
      const size = playback.audioSources.size;

      if (size !== lastSize) {
        lastSize = size;
        lastChange = now;
      }

      if (now - lastChange >= STABLE_FOR || now - start >= TIMEOUT) {
        clearInterval(poll);
        resolve();
      }
    }, POLLING_INTERVAL);
  });

  /* renderOffline */
  const lengthInSamples = Math.ceil(duration * sampleRate);

  if (lengthInSamples === 0) {
    throw new Error("Cannot render audio: duration is 0");
  }

  // Create offline audio context
  const offlineContext = new OfflineAudioContext(
    channels,
    lengthInSamples,
    sampleRate,
  );

  // Create a master gain node
  const masterGain = offlineContext.createGain();
  masterGain.connect(offlineContext.destination);

  // Schedule all registered audio sources
  for (const registration of playback.audioSources) {
    const { buffer, startTime } = registration;

    // Skip if the audio starts after the playback ends
    if (startTime >= duration) continue;

    // Create a buffer source for each registered audio
    const sourceNode = offlineContext.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.connect(masterGain);

    // Calculate when to start (in samples)
    const startTimeInContext = Math.max(0, startTime);

    // Calculate offset within the buffer (if startTime is negative)
    const offsetInBuffer = startTime < 0 ? -startTime : 0;

    // Calculate how long to play
    const maxDuration = duration - startTimeInContext;
    const bufferDuration = buffer.duration - offsetInBuffer;
    const playDuration = Math.min(maxDuration, bufferDuration);

    if (playDuration > 0) {
      sourceNode.start(startTimeInContext, offsetInBuffer, playDuration);
    }
  }

  // Render the audio
  const renderedBuffer = await offlineContext.startRendering();

  /* renderOfflineAsWav */
  const blob = audioBufferToWav(renderedBuffer);

  // Encode as base64 for transport back to Node
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read WAV blob"));
    reader.readAsDataURL(blob);
  });

  return {
    base64: dataUrl.slice(dataUrl.indexOf(",") + 1),
    duration,
  };

  /**
   * Convert an AudioBuffer to a WAV Blob.
   */
  function audioBufferToWav(buffer: AudioBuffer): Blob {
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;

    // Interleave channels
    const interleaved = interleaveChannels(buffer);
    const dataLength = interleaved.length * bytesPerSample;
    const headerLength = 44;
    const totalLength = headerLength + dataLength;

    const arrayBuffer = new ArrayBuffer(totalLength);
    const view = new DataView(arrayBuffer);

    // WAV header
    writeString(view, 0, "RIFF");
    view.setUint32(4, totalLength - 8, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); // byte rate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, "data");
    view.setUint32(40, dataLength, true);

    // Write audio data
    const offset = 44;
    for (let i = 0; i < interleaved.length; i++) {
      const sample = Math.max(-1, Math.min(1, interleaved[i]!));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset + i * 2, intSample, true);
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  }

  function writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  function interleaveChannels(buffer: AudioBuffer): Float32Array {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length;
    const result = new Float32Array(length * numberOfChannels);

    const channels: Float32Array[] = [];
    for (let c = 0; c < numberOfChannels; c++) {
      channels.push(buffer.getChannelData(c));
    }

    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numberOfChannels; c++) {
        result[i * numberOfChannels + c] = channels[c]![i]!;
      }
    }

    return result;
  }
}
