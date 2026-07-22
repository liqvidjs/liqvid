import { CaptionsEditor } from "@liqvid/studio";
import { useIsPreview } from "@liqvid/studio-plugin-api";
import { CodeRecording } from "@lqv/codemirror/recording";
import { ChalkboardTeacherIcon, FlaskIcon } from "@phosphor-icons/react";
import { Audio } from "liqvid";
import { useSearchParams } from "next/navigation";

import { LiqvidPlayer } from "@/components/liqvid/player.tsx";
import { DownloadButton } from "@/components/livecode/buttons/DownloadButton.tsx";
import {
  Actions,
  ClearButton,
  Controls,
  EditorPanel,
  FileTabs,
  FormatButton,
  HTMLPreview,
  LiveCode,
  MirrorButton,
  Record,
  Resize,
  RunButton,
  Tab,
  TabList,
  VimToggleButton,
} from "@/components/livecode/theme";

import { files } from "./files.ts";
import { useProjectFiles } from "./helpers.ts";
import { LiveCodeHTMLReplay } from "./production.tsx";
import { getLanguageExtension } from "./shared.ts";

import meta from "../.liqvid/recordings/2026-06-24T02-02-23-586Z/recording-meta.json";

export function LiveCodeHTMLRecord() {
  const params = useSearchParams();
  const assets = useProjectFiles().dir(".liqvid");
  const recordings = assets.dir("recordings");
  const latest = recordings.dir("2026-06-24T02-02-23-586Z");
  const isPreview = useIsPreview();

  if (isPreview) {
    return <LiveCodeHTMLReplay />;
  }

  return (
    <LiqvidPlayer
      duration={meta.duration}
      plugins={[CodeRecording]}
      // script={script}
    >
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
      <CaptionsEditor
        displayProps={{
          className:
            "absolute bottom-1/8 left-1/2 -translate-x-1/2 rounded-md bg-black/50 p-2 z-50 text-lg text-white captions-preview",
        }}
        transcript={assets.fetch("audio/transcript.json")}
      />
      <LiveCode name="html">
        <div className="@container flex w-(--split) flex-col overflow-hidden border-(--sep) border-0 border-r">
          <FileTabs />
          {Object.entries(files).map(([filename, content]) => (
            <EditorPanel filename={filename} key={filename}>
              <Record
                content={content}
                extensions={[getLanguageExtension(filename)]}
              />
            </EditorPanel>
          ))}
          <Controls>
            <VimToggleButton />
            <TabList>
              <Tab
                disabled
                id="replay"
                title="This is what the replay interface will look like"
              >
                <ChalkboardTeacherIcon />
                Replay
              </Tab>
              <Tab
                disabled
                id="playground"
                title="This is what the replay interface will look like"
              >
                <FlaskIcon />
                Playground
              </Tab>
            </TabList>

            <Actions>
              <RunButton />
              <ClearButton />
              <MirrorButton
                disabled
                title="This is what the replay interface will look like"
              />
              <FormatButton />
              <DownloadButton
                disabled
                title="This is what the replay interface will look like"
              />
            </Actions>
          </Controls>
        </div>

        <Resize dir="ew" variable="--split" />

        <HTMLPreview className="flex-1 bg-white" />
      </LiveCode>
      {/* <CodePrompt /> */}
    </LiqvidPlayer>
  );
}
