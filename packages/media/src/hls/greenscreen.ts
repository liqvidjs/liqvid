import { useEventListener } from "@liqvid/event-emitter/react";
import { isChrome } from "@liqvid/utils";
import { useEffect, useEffectEvent, useRef } from "react";

export type HexColor = `#${string}`;

export type GreenScreenConfig = Readonly<{
  /** Greenscreen color in hex format (default "#00FF00") */
  color?: HexColor;

  /** Tolerance for greenscreen color matching (0-255, default 50) */
  tolerance?: number;
}>;

/** Apply greenscreen effect to a `<video>` */
export function useGreenScreen({
  canvasRef,
  color = "#00FF00",
  enabled = false,
  // Chrome does weird things to colors
  tolerance = isChrome ? 60 : 50,
  video,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  enabled?: boolean;
  video: HTMLVideoElement | null;
} & GreenScreenConfig) {
  const animationFrameRef = useRef<number>(null);
  const videoFrameRef = useRef<{
    id: number;
    video: HTMLVideoElement;
  } | null>(null);

  const startProcessing = () => {
    if (video && typeof video.requestVideoFrameCallback === "function") {
      if (videoFrameRef.current !== null) return;
      videoFrameRef.current = {
        id: video.requestVideoFrameCallback(processVideoFrame),
        video,
      };
      return;
    }

    if (animationFrameRef.current !== null) return;
    animationFrameRef.current = requestAnimationFrame(processGreenscreen);
  };
  const startProcessing$ = useEffectEvent(startProcessing);

  const stopProcessing = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (videoFrameRef.current !== null) {
      videoFrameRef.current.video.cancelVideoFrameCallback(
        videoFrameRef.current.id,
      );
      videoFrameRef.current = null;
    }
  };
  const stopProcessing$ = useEffectEvent(stopProcessing);

  /* greenscreen processing - renders a single frame */
  const renderFrame = () => {
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    renderGreenScreen({
      canvas,
      color,
      source: video,
      tolerance,
    });
  };
  const renderFrame$ = useEffectEvent(renderFrame);

  /* greenscreen animation loop - continuously renders while playing */
  const processGreenscreen = useEffectEvent(() => {
    if (!video || video.paused || video.ended) return;

    renderFrame();
    animationFrameRef.current = requestAnimationFrame(processGreenscreen);
  });
  const processVideoFrame = useEffectEvent(() => {
    const scheduledFrame = videoFrameRef.current;
    videoFrameRef.current = null;
    if (
      !scheduledFrame ||
      scheduledFrame.video !== video ||
      scheduledFrame.video.paused ||
      scheduledFrame.video.ended
    ) {
      return;
    }

    renderFrame();
    videoFrameRef.current = {
      id: scheduledFrame.video.requestVideoFrameCallback(processVideoFrame),
      video: scheduledFrame.video,
    };
  });

  /* greenscreen effect */
  useEffect(() => {
    if (!enabled) return;

    if (!video) return;

    // Start if already playing
    if (!video.paused) {
      startProcessing$();
    }
    // Render first frame if video data already loaded
    else if (video.readyState >= 2) {
      renderFrame$();
    }

    return () => {
      stopProcessing$();
      disposeGreenScreen(canvasRef.current);
    };
  }, [enabled, video]);

  useEventListener(video, "play", startProcessing);
  useEventListener(video, "pause", stopProcessing);
  useEventListener(video, "ended", stopProcessing);
  useEventListener(video, "loadeddata", renderFrame);
  useEventListener(video, "seeked", renderFrame);
}

function supDistance(color1: RGB, color2: RGB) {
  return Math.max(
    Math.abs(color1.r - color2.r) / 2,
    Math.abs(color1.g - color2.g),
    Math.abs(color1.b - color2.b) / 2,
  );
}

type GreenScreenRenderer = {
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  program: WebGLProgram;
  texture: WebGLTexture;
  buffer: WebGLBuffer;
  keyColorLocation: WebGLUniformLocation;
  toleranceLocation: WebGLUniformLocation;
  textureWidth: number;
  textureHeight: number;
};

const renderers = new WeakMap<HTMLCanvasElement, GreenScreenRenderer>();

const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform vec3 u_keyColor;
  uniform float u_tolerance;

  void main() {
    vec4 pixel = texture2D(u_image, v_texCoord);
    vec3 delta = abs(pixel.rgb - u_keyColor);
    float distance = max(delta.g, max(delta.r * 0.5, delta.b * 0.5));
    float alpha = distance <= u_tolerance ? 0.0 : pixel.a;
    gl_FragColor = vec4(pixel.rgb * alpha, alpha);
  }
`;

/** Draw a source image and key its pixels on the GPU. */
export function renderGreenScreen({
  canvas,
  color = "#00FF00",
  source,
  tolerance = isChrome ? 60 : 50,
}: {
  canvas: HTMLCanvasElement;
  color?: HexColor;
  source: HTMLVideoElement | HTMLCanvasElement | OffscreenCanvas;
  tolerance?: number;
}): void {
  const width =
    source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const height =
    source instanceof HTMLVideoElement ? source.videoHeight : source.height;
  if (width === 0 || height === 0) return;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const renderer = getRenderer(canvas);
  if (!renderer) {
    renderGreenScreen2d(canvas, source, color, tolerance);
    return;
  }

  const { gl } = renderer;
  const keyColor = parseHexColor(color);
  gl.viewport(0, 0, width, height);
  gl.useProgram(renderer.program);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, renderer.texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
  if (renderer.textureWidth !== width || renderer.textureHeight !== height) {
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    renderer.textureWidth = width;
    renderer.textureHeight = height;
  }
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.uniform3f(
    renderer.keyColorLocation,
    keyColor.r / 255,
    keyColor.g / 255,
    keyColor.b / 255,
  );
  gl.uniform1f(renderer.toleranceLocation, tolerance / 255);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

/** Release WebGL resources associated with a greenscreen canvas. */
export function disposeGreenScreen(canvas: HTMLCanvasElement | null): void {
  if (!canvas) return;
  const renderer = renderers.get(canvas);
  if (!renderer) return;

  renderer.gl.deleteBuffer(renderer.buffer);
  renderer.gl.deleteTexture(renderer.texture);
  renderer.gl.deleteProgram(renderer.program);
  renderers.delete(canvas);
}

function getRenderer(canvas: HTMLCanvasElement): GreenScreenRenderer | null {
  const existing = renderers.get(canvas);
  if (existing) return existing;

  const gl =
    canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
    }) ??
    canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
    });
  if (!gl) return null;

  const renderer = createRenderer(gl);
  renderers.set(canvas, renderer);
  return renderer;
}

function createRenderer(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
): GreenScreenRenderer {
  const program = createProgram(gl);
  let buffer: WebGLBuffer | null = null;
  let texture: WebGLTexture | null = null;

  try {
    const keyColorLocation = getUniform(gl, program, "u_keyColor");
    const toleranceLocation = getUniform(gl, program, "u_tolerance");
    buffer = createQuad(gl, program);
    texture = createTexture(gl, program);
    gl.clearColor(0, 0, 0, 0);

    return {
      buffer,
      gl,
      keyColorLocation,
      program,
      texture,
      textureHeight: 0,
      textureWidth: 0,
      toleranceLocation,
    };
  } catch (error) {
    if (buffer) gl.deleteBuffer(buffer);
    if (texture) gl.deleteTexture(texture);
    gl.deleteProgram(program);
    throw error;
  }
}

function createProgram(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
): WebGLProgram {
  const vertexShader = compileShader(
    gl,
    gl.VERTEX_SHADER,
    VERTEX_SHADER_SOURCE,
  );
  let fragmentShader: WebGLShader;
  try {
    fragmentShader = compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      FRAGMENT_SHADER_SOURCE,
    );
  } catch (error) {
    gl.deleteShader(vertexShader);
    throw error;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error("Could not create greenscreen shader program");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;

  const message = gl.getProgramInfoLog(program) ?? "Shader linking failed";
  gl.deleteProgram(program);
  throw new Error(message);
}

function getUniform(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  program: WebGLProgram,
  name: string,
): WebGLUniformLocation {
  const location = gl.getUniformLocation(program, name);
  if (!location)
    throw new Error(`Could not locate greenscreen uniform ${name}`);
  return location;
}

function createQuad(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  program: WebGLProgram,
): WebGLBuffer {
  const positionLocation = gl.getAttribLocation(program, "a_position");
  const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
  if (positionLocation < 0 || texCoordLocation < 0) {
    throw new Error("Could not locate greenscreen shader attributes");
  }

  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("Could not allocate greenscreen vertex buffer");
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(texCoordLocation);
  gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);

  return buffer;
}

function createTexture(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  program: WebGLProgram,
): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) throw new Error("Could not allocate greenscreen texture");

  try {
    const imageLocation = getUniform(gl, program, "u_image");
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(imageLocation, 0);
    return texture;
  } catch (error) {
    gl.deleteTexture(texture);
    throw error;
  }
}

function compileShader(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not create greenscreen shader");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Shader compilation failed";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function renderGreenScreen2d(
  canvas: HTMLCanvasElement,
  source: HTMLVideoElement | HTMLCanvasElement | OffscreenCanvas,
  color: HexColor,
  tolerance: number,
): void {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return;

  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  const keyColor = parseHexColor(color);

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    if (supDistance({ b, g, r }, keyColor) <= tolerance) pixels[i + 3] = 0;
  }

  context.putImageData(imageData, 0, 0);
}

type RGB = Readonly<{
  r: number;
  g: number;
  b: number;
}>;

/** Parse a hex color string to RGB values */
function parseHexColor(hex: string): RGB {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return { b, g, r };
}
