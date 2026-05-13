import { useMemo } from "react";

export function useWebGLSupported(): boolean {
  return useMemo(() => {
    try {
      const canvas = document.createElement("canvas");
      const ctx =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      if (!ctx) return false;
      // Try to detect sandboxed/broken contexts
      const gl = ctx as WebGLRenderingContext;
      const vendor = gl.getParameter(gl.RENDERER);
      if (!vendor) return false;
      return true;
    } catch {
      return false;
    }
  }, []);
}
