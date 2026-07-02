const IS_CLIENT =
  typeof window !== "undefined" && typeof navigator !== "undefined";

export const isChrome = IS_CLIENT && navigator.userAgent.includes("Chrome");

export const isFirefox = IS_CLIENT && navigator.userAgent.includes("Firefox");

export const isSafari =
  IS_CLIENT &&
  navigator.userAgent.includes("Safari") &&
  !navigator.userAgent.includes("Chrome");

export const isMac = IS_CLIENT && navigator.platform === "MacIntel";
