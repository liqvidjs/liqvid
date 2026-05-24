"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

import { defaultAffords } from "./affordances.ts";

export function Fixes({ dataAffords }: { dataAffords?: string }): null {
  const { gl } = useThree();

  useEffect(() => {
    const affords = dataAffords ?? defaultAffords;
    if (affords) {
      gl.domElement.setAttribute("data-affords", affords);
    }
    gl.domElement.style.touchAction = "none";
  }, [dataAffords, gl.domElement]);

  return null;
}
