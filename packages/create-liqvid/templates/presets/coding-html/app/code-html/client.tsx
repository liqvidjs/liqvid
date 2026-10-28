"use client";

import dynamic from "next/dynamic";

export const ClientContent = dynamic(() =>
  import.meta.env.DEV
    ? import("./src/development.tsx").then((exports) => ({
        default: exports.LiveCodeHTMLRecord,
      }))
    : import("./src/production.tsx").then((exports) => ({
        default: exports.LiveCodeHTMLReplay,
      })),
);
