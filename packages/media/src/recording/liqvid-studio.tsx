import {
  type LiqvidStudioRecordingPlugin,
  packageNameToDirName,
  type RecordingComponentProps,
  usePluginApi,
} from "@liqvid/studio-plugin-api";
import { useCallback, useEffect, useState } from "react";

import { CameraPreview } from "./CameraPreview.tsx";
import {
  LiqvidMediaRecorder,
  type MediaRecorderConfig,
} from "./LiqvidMediaRecorder.mts";

import styles from "./studio-plugin.module.css";

const icon = (props?: React.JSX.IntrinsicElements["svg"]) => (
  <svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" {...props}>
    <title>Media recording</title>
    <path
      d="M211.31,196.69A16,16,0,0,1,200,224H56a16,16,0,0,1-11.32-27.31,1.59,1.59,0,0,0,.13-.13L116.43,128,44.82,59.44a1.59,1.59,0,0,0-.13-.13A16,16,0,0,1,56,32H200a16,16,0,0,1,11.32,27.31,1.59,1.59,0,0,0-.13.13L139.57,128l71.61,68.56A1.59,1.59,0,0,0,211.31,196.69Z"
      fill="#fff"
    />
  </svg>
);

type MediaDeviceMap = Record<MediaDeviceKind, MediaDeviceInfo[]>;

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
        acc[curr.kind].push(curr);
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
          if (grouped.audioinput.length > 0) {
            setSelectedAudioDevice(grouped.audioinput[0].deviceId);
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
          if (grouped.videoinput.length > 0) {
            setSelectedVideoDevice(grouped.videoinput[0].deviceId);
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
                {d.label}
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
                {d.label}
              </option>
            ))}
          </select>
        )}
        {videoEnabled && <CameraPreview />}
      </div>
    </div>
  );
}

function RecordingComponent({ name }: RecordingComponentProps) {
  const { makeToast } = usePluginApi();
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
      {icon({ height: 24, width: 24 })}

      <button className="lv-studio-button" onClick={onClick} type="button">
        Use
      </button>
    </div>
  );
}

function mediaDeviceKey(d: MediaDeviceInfo) {
  return `${d.kind}.${d.groupId}.${d.deviceId}`;
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
