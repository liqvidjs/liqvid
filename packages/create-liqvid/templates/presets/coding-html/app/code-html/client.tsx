"use client";

import dynamic from "next/dynamic";

export const ClientContent = dynamic(() => {
  return process.env.NODE_ENV === "development"
    ? import("./src/development.tsx").then((exports) => ({
        default: exports.LiveCodeHTMLRecord,
      }))
    : import("./src/production.tsx").then((exports) => ({
        default: exports.LiveCodeHTMLReplay,
      }));
});
