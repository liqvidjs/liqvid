import type { RecordingData } from "@liqvid/recording";
import type { ReplayData } from "@liqvid/utils";
import type { Seekable } from "@lqv/playback";
import type { Editor, TLStoreSnapshot } from "@tldraw/editor";

import type { FollowController } from "../src/follow.ts";
import { tldrawReplay } from "../src/replay.ts";
import type { ReplayState, TldrawEvent } from "../src/types.ts";

describe("tldraw replay read-only mode", () => {
  test("keeps the editor read-only after loading the recording snapshot", () => {
    let isReadonly = true;
    const editor = {
      getContainer: () => ({ clientWidth: 640 }),
      store: {
        loadStoreSnapshot({ store }: TLStoreSnapshot) {
          isReadonly = (store["instance:instance"] as { isReadonly: boolean })
            .isReadonly;
        },
        mergeRemoteChanges(callback: () => void) {
          callback();
        },
      },
      updateInstanceState({ isReadonly: next }: { isReadonly: boolean }) {
        isReadonly = next;
      },
    } as unknown as Editor;

    const playbackTarget = new EventTarget();
    Object.defineProperty(playbackTarget, "currentTime", { value: 0 });
    const playback = playbackTarget as unknown as Seekable;
    const follow = {
      setAuthorViewport() {},
      setScale() {},
    } as unknown as FollowController;
    const recording: RecordingData<ReplayData<TldrawEvent>, ReplayState> = {
      data: [],
      initial: {
        containerWidth: 640,
        pointer: [0, 0],
        snapshot: {
          schema: {},
          store: {
            "instance:instance": {
              isReadonly: false,
              typeName: "instance",
            },
          },
        } as unknown as TLStoreSnapshot,
        viewport: { camera: [0, 0, 1], page: "page:1" },
      },
      package: "@lqv/tldraw",
      version: "1.0.0",
    };

    const cleanup = tldrawReplay({
      editor,
      follow,
      handlePointer: () => {},
      isReadonly: true,
      playback,
      recording,
    } as Parameters<typeof tldrawReplay>[0]);

    expect(isReadonly).toBe(true);
    cleanup();
  });
});
