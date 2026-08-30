"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { demoPointerAt } from "@/lib/warpText";
import styles from "./WarpText.module.css";

const vertex = `#version 300 es
in vec2 position; in vec2 uv; out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`;

const fragment = `#version 300 es
precision highp float;
uniform sampler2D uTextTexture;
uniform vec2 uResolution, uPointer;
uniform float uPointerActive, uHover, uTime, uWarpStrength, uWarpScale, uSpeed, uPointerInfluence, uPointerStrength, uRefraction, uRipple;
uniform vec3 uTextColor;
in vec2 vUv; out vec4 fragColor;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p) { float value = 0.0, amplitude = 0.5; for (int i = 0; i < 4; i++) { value += amplitude * noise(p); p *= 2.02; amplitude *= 0.5; } return value; }
vec4 sampleText(vec2 uv) { if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0); return texture(uTextTexture, uv); }
void main() {
  vec2 uv = vUv; float time = uTime * uSpeed * uHover; float scale = max(uWarpScale, 0.001);
  vec2 drift = vec2(time * 0.055, -time * 0.045);
  vec2 ambient = (vec2(fbm(uv * scale * 3.1 + drift), fbm((uv + 19.17) * scale * 3.4 - drift.yx)) - 0.5) * uWarpStrength * 0.045 * uHover;
  float aspect = uResolution.x / max(uResolution.y, 1.0); vec2 delta = uv - uPointer; vec2 aspectDelta = vec2(delta.x * aspect, delta.y); float dist = length(aspectDelta); float radius = max(uPointerInfluence, 0.001); float lens = smoothstep(radius, 0.0, dist) * uPointerActive; float t = clamp(dist / radius, 0.0, 1.0); float bulge = t * (1.0 - t) * (1.0 - t) * 6.75 * uPointerActive; vec2 direction = dist > 0.0001 ? vec2(aspectDelta.x / aspect, aspectDelta.y) / dist : vec2(0.0); float ripple = (sin(dist * 28.0 - time * 4.2) - 0.5) * uRipple;
  vec2 pointerWarp = -direction * bulge * uPointerStrength * 0.045 + direction * ripple * bulge * uPointerStrength * 0.016; vec2 displaced = uv + ambient + pointerWarp; vec2 split = normalize(ambient + pointerWarp + vec2(0.0001)) * uRefraction * 0.16 * (0.35 + lens * 1.65) * uHover; vec4 base = sampleText(displaced); vec3 mask = vec3(sampleText(displaced + split).r, base.g, sampleText(displaced - split).b); vec3 color = mask * uTextColor + lens * base.a * 0.055; float alpha = max(max(sampleText(displaced + split).a, base.a), sampleText(displaced - split).a); fragColor = vec4(color, alpha);
}`;

type WarpTextProps = {
  text: string;
  color?: string;
  warpStrength?: number;
  warpScale?: number;
  speed?: number;
  pointerInfluence?: number;
  // Runs a scripted sweep for this long on mount, so the warp shows itself
  // off without the visitor having to find it. 0 disables it.
  demoSweepMs?: number;
  pointerStrength?: number;
  refraction?: number;
  ripple?: boolean;
  fontSize?: string | number;
  fontWeight?: string | number;
  fontFamily?: string;
  letterSpacing?: string | number;
  lineHeight?: string | number;
  onActiveChange?: (active: boolean) => void;
  className?: string;
  style?: CSSProperties;
};

type DrawProps = Required<Omit<WarpTextProps, "className" | "style" | "onActiveChange" | "demoSweepMs">>;

const fontValue = (value: string | number) => (typeof value === "number" ? `${value}px` : value);

function colorVector(color: string) {
  const value = color.replace("#", "");
  const hex = value.length === 3 ? value.split("").map((part) => part + part).join("") : value;
  return new Float32Array([
    Number.parseInt(hex.slice(0, 2), 16) / 255,
    Number.parseInt(hex.slice(2, 4), 16) / 255,
    Number.parseInt(hex.slice(4, 6), 16) / 255,
  ]);
}

function drawTextCanvas(container: HTMLDivElement, props: DrawProps) {
  const rect = container.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  const probe = document.createElement("span");
  Object.assign(probe.style, { position: "absolute", visibility: "hidden", whiteSpace: "pre", fontFamily: props.fontFamily, fontSize: fontValue(props.fontSize), fontWeight: String(props.fontWeight), letterSpacing: fontValue(props.letterSpacing), lineHeight: String(props.lineHeight) });
  probe.textContent = props.text;
  container.appendChild(probe);
  const computed = window.getComputedStyle(probe);
  let fontSize = Number.parseFloat(computed.fontSize) || 96;
  let letterSpacing = computed.letterSpacing === "normal" ? 0 : Number.parseFloat(computed.letterSpacing) || 0;
  let lineHeight = Number.parseFloat(computed.lineHeight);
  if (!Number.isFinite(lineHeight)) lineHeight = fontSize * (typeof props.lineHeight === "number" ? props.lineHeight : 0.9);
  const fontFamily = computed.fontFamily || "sans-serif";
  const fontWeight = computed.fontWeight || String(props.fontWeight);
  probe.remove();

  const setFont = () => { context.font = `${fontWeight} ${fontSize}px ${fontFamily}`; };
  const measure = () => Array.from(props.text).reduce((width, character) => width + context.measureText(character).width, 0) + Math.max(0, props.text.length - 1) * letterSpacing;
  setFont();
  const fit = Math.min(1, (rect.width * 0.86) / Math.max(measure(), 1), (rect.height * 0.78) / Math.max(lineHeight, 1));
  fontSize *= fit;
  letterSpacing *= fit;
  setFont();
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.fillStyle = props.color;
  context.textBaseline = "middle";
  let cursor = rect.width / 2 - measure() / 2;
  for (const [index, character] of Array.from(props.text).entries()) {
    context.fillText(character, cursor, rect.height / 2);
    cursor += context.measureText(character).width + (index === props.text.length - 1 ? 0 : letterSpacing);
  }
  return canvas;
}

export function WarpText({
  text,
  color = "#1C1C1C",
  warpStrength = 0.08,
  warpScale = 1.7,
  speed = 0.55,
  pointerInfluence = 0.42,
  demoSweepMs = 0,
  pointerStrength = 0.38,
  refraction = 0.018,
  ripple = true,
  fontSize = "clamp(3rem, min(18vw, 18vh), 14.5rem)",
  fontWeight = 900,
  fontFamily = "var(--font-pp-frama)",
  letterSpacing = "0",
  lineHeight = 0.9,
  onActiveChange,
  className = "",
  style,
}: WarpTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const demoSweepRef = useRef(demoSweepMs);

  useEffect(() => {
    demoSweepRef.current = demoSweepMs;
  }, [demoSweepMs]);

  const contextRef = useRef<{ setTextColor: (nextColor: string) => void } | null>(null);
  const colorRef = useRef(color);

  useEffect(() => {
    colorRef.current = color;
    contextRef.current?.setTextColor(color);
  }, [color]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof WebGL2RenderingContext === "undefined" || typeof ResizeObserver === "undefined") return;
    let disposed = false;
    let destroy: (() => void) | undefined;

    void import("ogl").then(({ Mesh, Program, Renderer, Texture, Triangle }) => {
      if (disposed) return;
      let renderer;
      try {
        renderer = new Renderer({ webgl: 2, alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 2) });
      } catch {
        return;
      }
      const gl = renderer.gl;
      gl.clearColor(0, 0, 0, 0);
      const canvas = gl.canvas;
      canvas.setAttribute("aria-hidden", "true");
      container.appendChild(canvas);
      const texture = new Texture(gl, { generateMipmaps: false, minFilter: gl.LINEAR, magFilter: gl.LINEAR, wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE });
      const program = new Program(gl, { vertex, fragment, transparent: true, depthTest: false, depthWrite: false, uniforms: { uTextTexture: { value: texture }, uResolution: { value: new Float32Array([1, 1]) }, uPointer: { value: new Float32Array([0.5, 0.5]) }, uPointerActive: { value: 0 }, uHover: { value: 0 }, uTime: { value: 0 }, uTextColor: { value: colorVector(colorRef.current) }, uWarpStrength: { value: warpStrength }, uWarpScale: { value: warpScale }, uSpeed: { value: speed }, uPointerInfluence: { value: pointerInfluence }, uPointerStrength: { value: pointerStrength }, uRefraction: { value: refraction }, uRipple: { value: ripple ? 1 : 0 } } });
      const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
      let frame = 0;
      const pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, strength: 0, targetStrength: 0 };
      let pointerTaken = false;
      const startedAt = performance.now();
      const render = () => renderer.render({ scene: mesh });
      const resize = () => {
        const rect = container.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        renderer.setSize(rect.width, rect.height);
        program.uniforms.uResolution.value.set([gl.drawingBufferWidth, gl.drawingBufferHeight]);
        texture.image = drawTextCanvas(container, { text, color: "#FFFFFF", warpStrength, warpScale, speed, pointerInfluence, pointerStrength, refraction, ripple, fontSize, fontWeight, fontFamily, letterSpacing, lineHeight });
        texture.needsUpdate = true;
        render();
      };
      const onPointerMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        pointerTaken = true;
        const rect = container.getBoundingClientRect();
        pointer.targetX = (event.clientX - rect.left) / rect.width;
        pointer.targetY = 1 - (event.clientY - rect.top) / rect.height;
        pointer.targetStrength = 1;
      };
      const onPointerLeave = () => { pointer.targetStrength = 0; };
      const loop = (now: number) => {
        if (disposed) return;
        if (!pointerTaken) {
          const swept = demoPointerAt(now - startedAt, demoSweepRef.current);
          if (swept) {
            pointer.targetX = swept.x;
            pointer.targetY = swept.y;
            pointer.targetStrength = 1;
          } else if (demoSweepRef.current > 0) {
            // The pass ends at the right, so recentre as the warp lets go.
            pointer.targetX = 0.5;
            pointer.targetStrength = 0;
          }
        }
        pointer.x += (pointer.targetX - pointer.x) * 0.12;
        pointer.y += (pointer.targetY - pointer.y) * 0.12;
        pointer.strength += (pointer.targetStrength - pointer.strength) * 0.08;
        program.uniforms.uPointer.value.set([pointer.x, pointer.y]);
        program.uniforms.uPointerActive.value = pointer.strength;
        program.uniforms.uHover.value = pointer.strength;
        program.uniforms.uTime.value = (now - startedAt) / 1000;
        render();
        frame = requestAnimationFrame(loop);
      };
      const observer = new ResizeObserver(resize);
      observer.observe(container);
      container.addEventListener("pointermove", onPointerMove);
      container.addEventListener("pointerleave", onPointerLeave);
      resize();
      // The texture captures pixels, rather than live text. Regenerate it
      // once Next's self-hosted face has loaded so deployed visitors never
      // retain a system-font texture from the first paint.
      document.fonts?.ready.then(() => {
        if (!disposed) resize();
      }).catch(() => {});
      contextRef.current = {
        setTextColor: (nextColor) => {
          program.uniforms.uTextColor.value.set(colorVector(nextColor));
        },
      };
      container.dataset.webglReady = "true";
      frame = requestAnimationFrame(loop);
      destroy = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        container.removeEventListener("pointermove", onPointerMove);
        container.removeEventListener("pointerleave", onPointerLeave);
        program.remove();
        gl.deleteTexture(texture.texture);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        contextRef.current = null;
        canvas.remove();
      };
    });

    return () => {
      disposed = true;
      container.dataset.webglReady = "false";
      destroy?.();
    };
  }, [fontFamily, fontSize, fontWeight, letterSpacing, lineHeight, pointerInfluence, pointerStrength, refraction, ripple, speed, text, warpScale, warpStrength]);

  const fallbackStyle = { "--warp-text-color": color, "--warp-text-font-family": fontFamily, "--warp-text-font-size": fontValue(fontSize), "--warp-text-font-weight": String(fontWeight), "--warp-text-letter-spacing": fontValue(letterSpacing), "--warp-text-line-height": String(lineHeight) } as CSSProperties;
  return (
    <div
      ref={containerRef}
      className={`${styles.root} ${className}`.trim()}
      style={style}
      data-testid="warp-text"
      data-webgl-ready="false"
      role="img"
      aria-label={text}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") onActiveChange?.(true);
      }}
      onPointerLeave={() => onActiveChange?.(false)}
    >
      <span className={styles.fallback} style={fallbackStyle} aria-hidden="true">{text}</span>
    </div>
  );
}
