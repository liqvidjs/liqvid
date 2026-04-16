"use client";

import {
  type SyntheticTextTrack,
  SyntheticVTTCue,
  type TextTrackKind,
  type TextTrackMode,
} from "@liqvid/playback";
import { usePlayback } from "@liqvid/playback/react";
import { useEffect, useRef } from "react";

export interface TrackProps {
  /**
   * Whether this track should be the default track.
   * If true, the track mode will be set to "showing".
   */
  default?: boolean;

  /**
   * The kind of track.
   * @default "subtitles"
   */
  kind?: TextTrackKind;

  /** A human-readable label for the track. */
  label?: string;

  /** The BCP 47 language tag for the track (e.g., "en", "es", "fr"). */
  srcLang?: string;

  /** URL to a WebVTT (.vtt) file containing the track cues. */
  src?: string;
}

/**
 * Parse a WebVTT timestamp to seconds.
 * Supports formats: "HH:MM:SS.mmm", "MM:SS.mmm", "SS.mmm"
 */
function parseVTTTimestamp(timestamp: string): number {
  const parts = timestamp.trim().split(":");

  if (parts.length === 3) {
    // HH:MM:SS.mmm
    const hours = Number.parseFloat(parts[0]);
    const minutes = Number.parseFloat(parts[1]);
    const seconds = Number.parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    // MM:SS.mmm
    const minutes = Number.parseFloat(parts[0]);
    const seconds = Number.parseFloat(parts[1]);
    return minutes * 60 + seconds;
  } else {
    // SS.mmm
    return Number.parseFloat(parts[0]);
  }
}

/**
 * Parse a WebVTT file content into an array of cues.
 */
function parseVTT(content: string): Array<{
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}> {
  const cues: Array<{
    id: string;
    startTime: number;
    endTime: number;
    text: string;
  }> = [];

  // Normalize line endings and split into blocks
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  let i = 0;

  // Skip the WEBVTT header
  while (i < lines.length && !lines[i].startsWith("WEBVTT")) {
    i++;
  }
  if (i < lines.length) {
    i++; // Skip the WEBVTT line
  }

  // Skip any header metadata (lines before the first blank line after WEBVTT)
  while (i < lines.length && lines[i].trim() !== "") {
    i++;
  }

  // Process cue blocks
  while (i < lines.length) {
    // Skip blank lines
    while (i < lines.length && lines[i].trim() === "") {
      i++;
    }

    if (i >= lines.length) break;

    let cueId = "";
    let timingLine = "";

    // Check if this line is a cue identifier or timing line
    const currentLine = lines[i];
    if (currentLine.includes("-->")) {
      // This is a timing line (no cue ID)
      timingLine = currentLine;
    } else {
      // This might be a cue ID or a NOTE/STYLE block
      if (
        currentLine.startsWith("NOTE") ||
        currentLine.startsWith("STYLE") ||
        currentLine.startsWith("REGION")
      ) {
        // Skip NOTE/STYLE/REGION blocks
        i++;
        while (i < lines.length && lines[i].trim() !== "") {
          i++;
        }
        continue;
      }

      // It's a cue ID
      cueId = currentLine.trim();
      i++;

      if (i >= lines.length) break;
      timingLine = lines[i];
    }

    // Parse the timing line
    const timingMatch = timingLine.match(/(.+?)\s*-->\s*(.+?)(?:\s|$)/);
    if (!timingMatch) {
      i++;
      continue;
    }

    const startTime = parseVTTTimestamp(timingMatch[1]);
    // Extract end time (may have settings after it)
    const endPart = timingMatch[2].split(/\s/)[0];
    const endTime = parseVTTTimestamp(endPart);

    i++;

    // Collect cue text (may span multiple lines)
    const textLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "") {
      textLines.push(lines[i]);
      i++;
    }

    const text = textLines.join("\n");

    if (text) {
      cues.push({ endTime, id: cueId, startTime, text });
    }
  }

  return cues;
}

/**
 * A component that adds a text track to the ambient Playback object.
 * Similar to the HTML `<track>` element, but works with Liqvid's playback system.
 *
 * @example
 * ```tsx
 * <Track
 *   src="/captions/en.vtt"
 *   kind="subtitles"
 *   srcLang="en"
 *   label="English"
 *   default
 * />
 * ```
 */
export function Track({
  default: isDefault = false,
  kind = "subtitles",
  label = "",
  src,
  srcLang = "",
}: TrackProps) {
  const playback = usePlayback();
  const trackRef = useRef<SyntheticTextTrack | null>(null);

  // Create and manage the text track
  useEffect(() => {
    // Create the track
    const track = playback.addTextTrack(kind, label, srcLang);
    trackRef.current = track;

    // Set initial mode
    if (isDefault) {
      track.mode = "showing";
    }

    // Cleanup: remove the track when unmounting
    return () => {
      playback.removeTextTrack(track);
      trackRef.current = null;
    };
  }, [playback, kind, label, srcLang, isDefault]);

  // Load and parse the VTT file
  useEffect(() => {
    const track = trackRef.current;
    if (!src || !track) return;

    let cancelled = false;

    fetch(src)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch VTT file: ${response.status}`);
        }
        return response.text();
      })
      .then((content) => {
        if (cancelled) return;

        // Parse the VTT content
        const parsedCues = parseVTT(content);

        // Add cues to the track
        for (const { id, startTime, endTime, text } of parsedCues) {
          const cue = new SyntheticVTTCue(startTime, endTime, text);
          cue.id = id;
          track.addCue(cue);
        }
      })
      .catch((error) => {
        console.error(`Failed to load track from ${src}:`, error);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  // This component doesn't render anything
  return null;
}
