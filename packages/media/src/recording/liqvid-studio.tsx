import { Button, DialogRoot, type LocalizedString } from "@liqvid/studio/ui";
import {
  type LiqvidStudioRecordingPlugin,
  packageNameToDirName,
  type RecordingComponentProps,
  usePluginApi,
  useProjectParams,
  useProjectPath,
} from "@liqvid/studio-plugin-api";
import { RelativeFile } from "effect-paths";
import { useCallback, useEffect, useState } from "react";

import { CameraPreview } from "./CameraPreview.tsx";
import {
  LiqvidMediaRecorder,
  type MediaRecorderConfig,
} from "./LiqvidMediaRecorder.ts";
import {
  canGeneratePlainTranscriptAction,
  generatePlainTranscriptAction,
  reprocessHlsAction,
} from "./server.ts";
import { TranscriptDialog } from "./TranscriptDialog.tsx";

import styles from "./studio-plugin.module.css";

const PLAIN_TRANSCRIPT = RelativeFile("plain.txt");

const icon = (props?: React.JSX.IntrinsicElements["svg"]) => (
  <svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" {...props}>
    <title>Media recording</title>
    <path
      d="M211.31,196.69A16,16,0,0,1,200,224H56a16,16,0,0,1-11.32-27.31,1.59,1.59,0,0,0,.13-.13L116.43,128,44.82,59.44a1.59,1.59,0,0,0-.13-.13A16,16,0,0,1,56,32H200a16,16,0,0,1,11.32,27.31,1.59,1.59,0,0,0-.13.13L139.57,128l71.61,68.56A1.59,1.59,0,0,0,211.31,196.69Z"
      fill="#fff"
    />
  </svg>
);

type MediaDeviceMap = Readonly<Record<MediaDeviceKind, MediaDeviceInfo[]>>;

const t = {
  generateTranscript: "Generate transcript" as LocalizedString,
  generatingTranscript: "Generating transcript…" as LocalizedString,
  hlsJobStarted: "HLS reprocessing job started" as LocalizedString,
  reprocessHls: "Reprocess HLS" as LocalizedString,
  reprocessingHls: "Starting HLS job…" as LocalizedString,
};

function ConfigurationComponent() {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);

  const [selectedAudioDevice, setSelectedAudioDevice] = useState<
    string | undefined
  >(undefined);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<
    string | undefined
  >(undefined);

  const [devices, setDevices] = useState<MediaDeviceMap>({
    audioinput: [],
    audiooutput: [],
    videoinput: [],
  });

  const refreshDevices = useCallback(async () => {
    const deviceList = await navigator.mediaDevices.enumerateDevices();
    const grouped = deviceList.reduce(
      (acc, curr) => {
        const devices = acc[curr.kind];
        const duplicateIndex = devices.findIndex(
          (device) => mediaDeviceKey(device) === mediaDeviceKey(curr),
        );

        if (duplicateIndex === -1) {
          devices.push(curr);
        } else if (!devices[duplicateIndex]!.label && curr.label) {
          devices[duplicateIndex] = curr;
        }
        return acc;
      },
      {
        audioinput: [],
        audiooutput: [],
        videoinput: [],
      } as MediaDeviceMap,
    );
    setDevices(grouped);
    return grouped;
  }, []);

  useEffect(() => {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices) return;

    const handleDeviceChange = () => {
      void refreshDevices()
        .then((grouped) => {
          if (
            audioEnabled &&
            !grouped.audioinput.some(
              (device) => device.deviceId === selectedAudioDevice,
            )
          ) {
            setSelectedAudioDevice(grouped.audioinput[0]?.deviceId);
          }

          if (
            videoEnabled &&
            !grouped.videoinput.some(
              (device) => device.deviceId === selectedVideoDevice,
            )
          ) {
            setSelectedVideoDevice(grouped.videoinput[0]?.deviceId);
          }
        })
        .catch((error: unknown) => {
          console.error("Failed to refresh media devices:", error);
        });
    };

    mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [
    audioEnabled,
    refreshDevices,
    selectedAudioDevice,
    selectedVideoDevice,
    videoEnabled,
  ]);

  // Configure recorder when device selection changes
  useEffect(() => {
    const config: MediaRecorderConfig = {};

    if (audioEnabled && selectedAudioDevice) {
      config.audioDeviceId = selectedAudioDevice;
    }

    if (videoEnabled && selectedVideoDevice) {
      config.videoDeviceId = selectedVideoDevice;
    }

    MediaRecording.recorder.configure(config);
  }, [audioEnabled, videoEnabled, selectedAudioDevice, selectedVideoDevice]);

  const handleAudioToggle = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const checked = e.target.checked;

      if (checked) {
        setAudioLoading(true);
        try {
          // Request permission first
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          // Stop the permission stream immediately
          for (const track of stream.getTracks()) {
            track.stop();
          }

          const grouped = await refreshDevices();

          // Auto-select first device if available
          const first = grouped.audioinput[0];
          if (first) {
            setSelectedAudioDevice(first.deviceId);
          }

          setAudioEnabled(true);
        } catch (e) {
          console.error("Failed to get audio permission:", e);
        } finally {
          setAudioLoading(false);
        }
      } else {
        setAudioEnabled(false);
        setSelectedAudioDevice(undefined);
      }
    },
    [refreshDevices],
  );

  const handleVideoToggle = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const checked = e.target.checked;

      if (checked) {
        setVideoLoading(true);
        try {
          // Request permission first
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          // Stop the permission stream immediately
          for (const track of stream.getTracks()) {
            track.stop();
          }

          const grouped = await refreshDevices();

          // Auto-select first device if available
          const first = grouped.videoinput[0];
          if (first) {
            setSelectedVideoDevice(first.deviceId);
          }

          setVideoEnabled(true);
        } catch (e) {
          console.error("Failed to get video permission:", e);
        } finally {
          setVideoLoading(false);
        }
      } else {
        setVideoEnabled(false);
        setSelectedVideoDevice(undefined);
      }
    },
    [refreshDevices],
  );

  return (
    <div>
      <div className={styles.row}>
        <label>
          <input
            checked={audioEnabled || audioLoading}
            disabled={audioLoading}
            name="captureAudio"
            onChange={handleAudioToggle}
            type="checkbox"
          />
          Audio
        </label>
        {audioLoading && <Spinner />}
        {audioEnabled && !audioLoading && devices.audioinput.length > 0 && (
          <select
            name="audioInput"
            onChange={(e) => {
              setSelectedAudioDevice(e.target.value);
            }}
            value={selectedAudioDevice}
          >
            {devices.audioinput.map((d) => (
              <option key={mediaDeviceKey(d)} value={d.deviceId}>
                {mediaDeviceLabel(d)}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className={styles.row}>
        <label>
          <input
            checked={videoEnabled || videoLoading}
            disabled={videoLoading}
            name="captureVideo"
            onChange={handleVideoToggle}
            type="checkbox"
          />
          Video
        </label>
        {videoLoading && <Spinner />}
        {videoEnabled && !videoLoading && devices.videoinput.length > 0 && (
          <select
            name="videoInput"
            onChange={(e) => setSelectedVideoDevice(e.target.value)}
            value={selectedVideoDevice}
          >
            {devices.videoinput.map((d) => (
              <option key={mediaDeviceKey(d)} value={d.deviceId}>
                {mediaDeviceLabel(d)}
              </option>
            ))}
          </select>
        )}
        {videoEnabled && <CameraPreview />}
      </div>
    </div>
  );
}

function RecordingComponent({
  files,
  loadFile,
  name,
}: RecordingComponentProps) {
  const { makeToast } = usePluginApi();
  const projectParams = useProjectParams();
  const projectPath = useProjectPath();
  const [updatedFiles, setUpdatedFiles] = useState<readonly string[] | null>(
    null,
  );
  const mediaFiles = updatedFiles ?? files.list();
  const hasHlsFiles = mediaFiles.some((filename) =>
    filename.startsWith("hls/"),
  );
  const visibleFiles = mediaFiles.filter(
    (filename) => !filename.startsWith("hls/"),
  );
  const [canGenerateTranscript, setCanGenerateTranscript] = useState(false);
  const [isReprocessingHls, setIsReprocessingHls] = useState(false);
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    let active = true;

    void canGeneratePlainTranscriptAction()
      .then((enabled) => {
        if (active) setCanGenerateTranscript(enabled);
      })
      .catch((error: unknown) => {
        console.error("Failed to load media recording configuration:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  const hasFile = (filename: string) =>
    files.has(filename) || mediaFiles.includes(filename);

  const refreshFileList = (updatedFiles: string[]) => {
    setUpdatedFiles(updatedFiles);
  };

  const handleReprocessHls = async () => {
    setIsReprocessingHls(true);
    try {
      await reprocessHlsAction({
        projectParams,
        projectPath,
        recordingName: name,
      });
      makeToast({ title: t.hlsJobStarted, type: "success" });
    } catch (error) {
      makeToast({
        message: error instanceof Error ? error.message : undefined,
        title: "Failed to reprocess HLS video",
        type: "negative",
      });
    } finally {
      setIsReprocessingHls(false);
    }
  };

  const handleGenerateTranscript = async () => {
    setIsGeneratingTranscript(true);
    try {
      refreshFileList(
        await generatePlainTranscriptAction({
          projectParams,
          projectPath,
          recordingName: name,
        }),
      );
      makeToast({ title: "Transcript generated", type: "success" });
    } catch (error) {
      makeToast({
        message: error instanceof Error ? error.message : undefined,
        title: "Failed to generate transcript",
        type: "negative",
      });
    } finally {
      setIsGeneratingTranscript(false);
    }
  };

  const handleViewTranscript = async () => {
    setIsTranscriptOpen(true);
    setIsLoadingTranscript(true);
    try {
      setTranscript(await loadFile(PLAIN_TRANSCRIPT));
    } catch (error) {
      makeToast({
        message: error instanceof Error ? error.message : undefined,
        title: "Failed to load transcript",
        type: "negative",
      });
      setIsTranscriptOpen(false);
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(
        `const recordings = useRecordings();
const latest = recordings.dir(${JSON.stringify(name)});

<Audio>
  <source
    src={latest
      .dir(${JSON.stringify(packageNameToDirName(MediaRecording.package))})
      .file("audio.webm")}
    type="audio/webm" />
  <source
    src={latest
      .dir(${JSON.stringify(packageNameToDirName(MediaRecording.package))})
      .file("audio.mp4")}
    type="audio/mp4" />
</Audio>
`,
      );

      makeToast({
        title: "Copied code to clipboard",
        type: "success",
      });
    } catch (_error) {}
  };

  return (
    <div>
      <h4 className={styles.title}>
        {icon({ className: styles.icon, height: 24, width: 24 })}
        Audio/Video
      </h4>
      <ul className={styles.fileList}>
        {visibleFiles.map((filename) => (
          <li key={filename}>
            <code>{filename}</code>
          </li>
        ))}
        {hasHlsFiles && (
          <li>
            <code>hls/</code>
          </li>
        )}
        {visibleFiles.length === 0 && !hasHlsFiles && (
          <li>No media files available.</li>
        )}
      </ul>
      <div className={styles.actions}>
        {hasFile("video.webm") && (
          <Button disabled={isReprocessingHls} onClick={handleReprocessHls}>
            {isReprocessingHls ? t.reprocessingHls : t.reprocessHls}
          </Button>
        )}
        {canGenerateTranscript &&
          !hasFile(PLAIN_TRANSCRIPT) &&
          (hasFile("audio.webm") || hasFile("video.webm")) && (
            <Button
              disabled={isGeneratingTranscript}
              onClick={handleGenerateTranscript}
            >
              {isGeneratingTranscript
                ? t.generatingTranscript
                : t.generateTranscript}
            </Button>
          )}
        {hasFile(PLAIN_TRANSCRIPT) && (
          <button
            className="lv-studio-button"
            disabled={isLoadingTranscript}
            onClick={handleViewTranscript}
            type="button"
          >
            {isLoadingTranscript ? "Loading transcript…" : "View transcript"}
          </button>
        )}
        <button className="lv-studio-button" onClick={onClick} type="button">
          Use
        </button>
      </div>
      <DialogRoot onOpenChange={setIsTranscriptOpen} open={isTranscriptOpen}>
        <TranscriptDialog transcript={transcript} />
      </DialogRoot>
    </div>
  );
}

function mediaDeviceKey(d: MediaDeviceInfo) {
  return `${d.kind}.${d.groupId}.${d.deviceId}`;
}

function mediaDeviceLabel(d: MediaDeviceInfo) {
  const label =
    d.label || (d.kind === "audioinput" ? "Audio input" : "Video input");
  return d.kind === "audioinput" && d.deviceId === "default"
    ? `Default — ${label}`
    : label;
}

function Spinner() {
  return <span className={styles.spinner} />;
}

export const MediaRecording = {
  configurationComponent: ConfigurationComponent,
  icon,
  name: "Audio/Video",
  package: "@liqvid/media",
  recorder: new LiqvidMediaRecorder(),
  recordingComponent: RecordingComponent,
  version: "1.0.0",
} satisfies LiqvidStudioRecordingPlugin<Blob, Blob>;
