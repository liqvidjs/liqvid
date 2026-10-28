"use client";

import "./stylex.css";

import { lazy } from "react";

export type { LiveCodeHelperProps } from "./control.tsx";

export const LiveCodeHelper = lazy(
  import.meta.env.DEV
    ? () =>
        import("./control.tsx").then((module) => ({
          default: module.LiveCodeHelper,
        }))
    : async () => ({ default: () => null as unknown as React.JSX.Element }),
);
