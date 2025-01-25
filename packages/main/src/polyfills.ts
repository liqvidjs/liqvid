import {isClient} from "./utils/rsc";
const id = <T>(_: T) => _;

export const fullscreenEnabled: boolean = isClient
  ? (
      [
        "fullscreenEnabled",
        "webkitFullscreenEnabled",
        "mozFullScreenEnabled",
        "msFullscreenEnabled",
      ] as const
    )
      // biome-ignore lint/suspicious/noExplicitAny: vendor-specific
      .map((_) => (document as any)[_])
      .concat(false)
      .find((_) => _ !== undefined)
  : false;

export const requestFullScreen: () => Promise<void> = isClient
  ? [
      "requestFullscreen",
      "webkitRequestFullscreen",
      "mozRequestFullScreen",
      "msRequestFullscreen",
    ]
      // biome-ignore lint/suspicious/noExplicitAny: vendor-specific
      .map((_) => (document as any).body[_])
      .concat(() => {})
      .find(id)
      .bind(document.body)
  : async () => {};

export const exitFullScreen: () => Promise<void> = isClient
  ? (
      [
        "exitFullscreen",
        "webkitExitFullscreen",
        "mozCancelFullScreen",
        "msExitFullscreen",
      ] as const
    )
      // biome-ignore lint/suspicious/noExplicitAny: vendor-specific
      .map((_) => (document as any)[_])
      .concat(async () => {})
      .find(id)
      .bind(document)
  : async () => {};

export const isFullScreen = () =>
  (["fullscreen", "webkitIsFullScreen", "mozFullScreen"] as const)
    // biome-ignore lint/suspicious/noExplicitAny: vendor-specific
    .map((_) => (document as any)[_] as boolean)
    .find((_) => _ !== undefined);

export function onFullScreenChange(callback: EventListener): void {
  for (const event of [
    "fullscreenchange",
    "webkitfullscreenchange",
    "mozfullscreenchange",
    "MSFullscreenChange",
  ] as const)
    document.addEventListener(event, callback);
}
