"use client";

import dynamic from "next/dynamic";

export const LiveCodeHTML = dynamic(() => {
  return process.env.NODE_ENV === "development"
    ? import("./development.tsx").then((exports) => ({
        default: exports.LiveCodeHTMLRecord,
      }))
    : import("./production.tsx").then((exports) => ({
        default: exports.LiveCodeHTMLReplay,
      }));
});
