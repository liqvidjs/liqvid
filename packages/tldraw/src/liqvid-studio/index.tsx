"use client";

import "./stylex.css";

import { lazy } from "react";

export type { TldrawHelperProps } from "./control.tsx";

export const TldrawHelper = lazy(
  import.meta.env.DEV
    ? () => import("./control.tsx").then((m) => ({ default: m.TldrawHelper }))
    : async () => ({ default: () => null as unknown as React.JSX.Element }),
);
