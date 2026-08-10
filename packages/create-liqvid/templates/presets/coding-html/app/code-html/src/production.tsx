import { ReplayMultiple } from "@lqv/livecode";
import { ChalkboardTeacherIcon, FlaskIcon } from "@phosphor-icons/react";
import { Audio, Track } from "liqvid";

import { HlsVideo } from "#components/liqvid/HlsVideo.tsx";
import { LiqvidPlayer } from "#components/liqvid/player.tsx";
import { DownloadButton } from "#components/livecode/buttons/DownloadButton.tsx";
import {
  Actions,
  ClearButton,
  Controls,
  Editor,
  EditorGroup,
  EditorPanel,
  FileTabs,
  FormatButton,
  HTMLPreview,
  LiveCode,
  MirrorButton,
  Replay,
  Resize,
  RunButton,
  Tab,
  TabList,
  VimToggleButton,
} from "#components/livecode/theme.tsx";

import { files } from "./files.ts";
import { useProjectFiles } from "./helpers.ts";
import { getLanguageExtension } from "./shared.ts";

// uncomment these once you have a recording/thumbnails to use
// import meta from "../.liqvid/recordings/2026-06-24T02-02-23-586Z/recording-meta.json";
// import ThumbMeta from "../.liqvid/thumbs/thumbnails-job.json";

export function LiveCodeHTMLReplay() {
  const projectFiles = useProjectFiles();
  const assets = projectFiles.dir(".liqvid");
  const recordings = assets.dir("recordings");
  const latest = recordings.dir("2026-06-24T02-02-23-586Z");

  return (
    <LiqvidPlayer
      // duration={meta.duration}
      //thumbs={{
      //  ...ThumbMeta,
      //  path: projectFiles.dir(".liqvid/thumbs").pattern("%c/%s.png"),
      //}}
      transcript={assets.fetch("audio/transcript.json")}
    >
      <Track
        kind="subtitles"
        label="English"
        src={assets.file("audio/captions.vtt")}
      />
      <HlsVideo
        className="absolute right-0 bottom-(--lv-controls-height) z-30 h-1/5"
        greenscreen
        hls={latest.dir("@liqvid@media/hls").file("stream.m3u8")}
      />

      <Audio src={latest.dir("@liqvid@media").file("audio.webm")}>
        <source
          src={latest.dir("@liqvid@media").file("audio.webm")}
          type="audio/webm"
        />
        <source
          src={latest.dir("@liqvid@media").file("audio.mp4")}
          type="audio/mp4"
        />
      </Audio>

      <LiveCode name="html">
        <div className="@container flex w-(--split) flex-col overflow-hidden border-(--sep) border-0 border-r">
          <FileTabs />
          <EditorGroup name="replay">
            {Object.entries(files).map(([filename, content]) => (
              <EditorPanel filename={filename} key={filename}>
                <Replay
                  content={content}
                  extensions={[getLanguageExtension(filename)]}
                />
              </EditorPanel>
            ))}
            <ReplayMultiple
              replay={latest.dir("@lqv@codemirror").fetch("recording.json")}
            />
          </EditorGroup>
          <EditorGroup name="playground">
            {Object.keys(files).map((filename) => (
              <EditorPanel filename={filename} key={filename}>
                <Editor extensions={[getLanguageExtension(filename)]} />
              </EditorPanel>
            ))}
          </EditorGroup>
          <Controls>
            <VimToggleButton />
            <TabList>
              <Tab id="replay" title="Watch me code (read-only)">
                <ChalkboardTeacherIcon />
                Replay
              </Tab>
              <Tab id="playground" title="Experiment with the code on your own">
                <FlaskIcon />
                Playground
              </Tab>
            </TabList>

            <Actions>
              <RunButton />
              <ClearButton />
              <MirrorButton />
              <FormatButton />
              <DownloadButton />
            </Actions>
          </Controls>
        </div>

        <Resize dir="ew" variable="--split" />

        <div className="flex flex-1 flex-col">
          <HTMLPreview className="flex-1 bg-white" />
          <Resize dir="sn" variable="--v-split" />
          <ConsoleRoot className="data-[expanded=true]:h-(--v-split)">
            <WebConsole />
          </ConsoleRoot>
        </div>
      </LiveCode>
    </LiqvidPlayer>
  );
}
