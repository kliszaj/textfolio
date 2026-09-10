"use client";

import { useEffect, useRef } from "react";
import {
  ASCII_CAMERA_DISTANCE,
  ASCII_CAMERA_FOV_DEG,
  ASCII_EXTRUDE_LAYERS,
  ASCII_RAIN_PALETTE,
  asciiCellStateAt,
  asciiJunkGlyph,
  ASCII_EXTRUDE_RISE,
  ASCII_TILT_Y_RATIO,
  extrudeLayerShade,
  demoTiltAt,
  DEFAULT_ASCII_TEXT_CONFIG,
  chipForBrightness,
  asciiFontSizeForHost,
  planeHeightForFontSize,
  textTextureLayout,
} from "@/lib/asciiText";
import type { ASCIITextConfig } from "@/lib/asciiText";
import styles from "./ASCIIText.module.css";

const vertexShader = `
varying vec2 vUv;
uniform float uTime;
uniform float uEnableWaves;
void main() {
  vUv = uv;
  vec3 transformed = position;
  float time = uTime * 5.0;
  transformed.x += sin(time + position.y) * 0.5 * uEnableWaves;
  transformed.y += cos(time + position.z) * 0.15 * uEnableWaves;
  transformed.z += sin(time + position.x) * uEnableWaves;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}`;

const fragmentShader = `
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uCrtCurvature;
uniform float uCrtScanlineIntensity;

vec2 crtCurve(vec2 uv) {
  vec2 centred = uv * 2.0 - 1.0;
  float curve = dot(centred, centred) * 0.075 * uCrtCurvature;
  return centred * (1.0 + curve) * 0.5 + 0.5;
}

void main() {
  // The source texture takes a restrained barrel curve before it is sampled
  // into ASCII cells. The scanline lives in this render pass too, so it bends
  // with the text rather than sitting as a flat page overlay.
  vec2 uv = crtCurve(vUv);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;

  // A fixed chromatic split fringes the glyph edges; driving it off time made
  // the whole treatment shimmer.
  vec2 split = vec2(0.006, 0.0);
  float r = texture2D(uTexture, uv + split).r;
  float g = texture2D(uTexture, uv).g;
  float b = texture2D(uTexture, uv - split).b;
  float a = texture2D(uTexture, uv).a;
  float scanline = 1.0 - (0.13 * uCrtScanlineIntensity) * (0.5 + 0.5 * sin(uv.y * 940.0));
  gl_FragColor = vec4(vec3(r, g, b) * scanline, a);
}`;

// Kept below a retro-game simulation: its job is to give the ASCII source a
// glass-screen character while leaving the type's silhouette readable.
const CRT_SCANLINE_INTENSITY = 0.68;

const CHARACTERS = " .`^\\\",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
type ASCIITextProps = Partial<ASCIITextConfig> & {
  text: string;
  // Runs a scripted left-right sweep for this long on mount, so the tilt is
  // visible without the visitor having to find it. 0 disables it.
  demoTiltMs?: number;
  // 0-1 type-in progress. 1 means fully typed, which is the resting state.
  typeProgress?: number;
  // Enables a click-triggered whole-word matrix rebuild. Hero keeps this off
  // until its scripted intro has finished.
  interactive?: boolean;
};

export const ASCII_DECOMPOSE_MS = 800;
export const ASCII_REBUILD_BLANK_MS = 90;
export const ASCII_REBUILD_RAIN_MS = 1100;
export const ASCII_REBUILD_SETTLE_MS = 130;
export const ASCII_REBUILD_TOTAL_MS =
  ASCII_DECOMPOSE_MS +
  ASCII_REBUILD_BLANK_MS +
  ASCII_REBUILD_RAIN_MS +
  ASCII_REBUILD_SETTLE_MS;

export type ASCIIRebuildPhase = "decompose" | "blank" | "rebuild" | "settle" | "idle";

export function asciiRebuildPhaseAt(elapsedMs: number): {
  phase: ASCIIRebuildPhase;
  progress: number;
} {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return { phase: "idle", progress: 1 };
  if (elapsedMs < ASCII_DECOMPOSE_MS) {
    return { phase: "decompose", progress: 1 - elapsedMs / ASCII_DECOMPOSE_MS };
  }
  if (elapsedMs < ASCII_DECOMPOSE_MS + ASCII_REBUILD_BLANK_MS) {
    return { phase: "blank", progress: 0 };
  }
  const rebuildElapsed = elapsedMs - ASCII_DECOMPOSE_MS - ASCII_REBUILD_BLANK_MS;
  if (rebuildElapsed < ASCII_REBUILD_RAIN_MS) {
    return { phase: "rebuild", progress: rebuildElapsed / ASCII_REBUILD_RAIN_MS };
  }
  if (elapsedMs < ASCII_REBUILD_TOTAL_MS) return { phase: "settle", progress: 1 };
  return { phase: "idle", progress: 1 };
}

export function ASCIIText({
  text,
  enableWaves = DEFAULT_ASCII_TEXT_CONFIG.enableWaves,
  asciiFontSize = DEFAULT_ASCII_TEXT_CONFIG.asciiFontSize,
  textFontSize = DEFAULT_ASCII_TEXT_CONFIG.textFontSize,
  planeScale = DEFAULT_ASCII_TEXT_CONFIG.planeScale,
  extrudeDepth = DEFAULT_ASCII_TEXT_CONFIG.extrudeDepth,
  tiltStrength = DEFAULT_ASCII_TEXT_CONFIG.tiltStrength,
  crtCurvature = DEFAULT_ASCII_TEXT_CONFIG.crtCurvature,
  randomizeGlyphColors = DEFAULT_ASCII_TEXT_CONFIG.randomizeGlyphColors,
  demoTiltMs = 0,
  typeProgress = 1,
  interactive = true,
}: ASCIITextProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rainBurstRef = useRef<{
    originX: number;
    startedAt: number;
  } | null>(null);
  const rainClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Held in a ref, not a dependency: rebuilding the WebGL context because a
  // number changed would be catastrophic.
  const demoTiltRef = useRef(demoTiltMs);

  // Both held in refs, not deps: they change every frame as the intro runs,
  // and rebuilding the WebGL context to read a number would be catastrophic.
  const typeProgressRef = useRef(typeProgress);

  useEffect(() => {
    demoTiltRef.current = demoTiltMs;
  }, [demoTiltMs]);

  useEffect(() => {
    typeProgressRef.current = typeProgress;
  }, [typeProgress]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === "undefined" || typeof WebGLRenderingContext === "undefined") return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    void import("three").then((THREE) => {
      if (disposed) return;
      // offsetWidth/Height, not getBoundingClientRect: the hero sheet this
      // sits in rotates during a return visit's stack-collapse animation,
      // and getBoundingClientRect would return that rotated on-screen box
      // instead of the host's real, unrotated layout size.
      const rect = { width: host.offsetWidth, height: host.offsetHeight };
      if (!rect.width || !rect.height) return;

      const textCanvas = document.createElement("canvas");
      const textContext = textCanvas.getContext("2d");
      const sampleCanvas = document.createElement("canvas");
      const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
      if (!textContext || !sampleContext) return;

      const pre = document.createElement("pre");
      pre.style.fontSize = `${asciiFontSize}px`;
      // It carries a full-bleed gradient clipped to its own text. With the
      // colour canvas drawing instead, it has no text to clip to, and any
      // browser that fails that clip paints the whole box -- which is the
      // rectangle that flashes on the way into this treatment.
      pre.style.display = randomizeGlyphColors ? "none" : "block";
      host.appendChild(pre);

      const outputCanvas = document.createElement("canvas");
      outputCanvas.className = styles.output;
      outputCanvas.style.display = randomizeGlyphColors ? "block" : "none";
      const outputContext = outputCanvas.getContext("2d");
      if (!outputContext) {
        pre.remove();
        return;
      }
      host.appendChild(outputCanvas);

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
      renderer.setPixelRatio(1);
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.className = styles.renderer;
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        ASCII_CAMERA_FOV_DEG,
        rect.width / rect.height,
        1,
        1000
      );
      camera.position.z = ASCII_CAMERA_DISTANCE;
      let frame = 0;
      let mesh: InstanceType<typeof THREE.Mesh> | undefined;
      let material: InstanceType<typeof THREE.ShaderMaterial> | undefined;
      let texture: InstanceType<typeof THREE.CanvasTexture> | undefined;
      let characterWidth = asciiFontSize * 0.6;
      let cellFontSize = asciiFontSize;
      const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
      const colorSeed = Math.floor(Math.random() * 1_000_000);

      // The original font's rendered size, straight off the fallback span --
      // it already carries --headline-font-size, so this tracks the real
      // headline at any viewport rather than assuming one.
      const measureTargetFontSize = () => {
        const fallback = host.querySelector(`.${styles.fallback}`);
        if (!fallback) return 0;
        return parseFloat(window.getComputedStyle(fallback).fontSize) || 0;
      };

      const headlineCanvasFont = () => {
        const fallback = host.querySelector(`.${styles.fallback}`);
        if (!fallback) return `900 ${textFontSize}px sans-serif`;
        const computed = window.getComputedStyle(fallback);
        return `${computed.fontWeight || "900"} ${textFontSize}px ${computed.fontFamily || "sans-serif"}`;
      };

      // Sized to match the font rather than to a fixed world height, because
      // the headline grows with the viewport while its container stops at a
      // clamp -- so the ratio between them is not constant.
      const applyPlaneScale = () => {
        if (!mesh) return;
        // Same reason as above: offsetWidth/Height, not the
        // rotation-sensitive getBoundingClientRect.
        const size = { width: host.offsetWidth, height: host.offsetHeight };
        const targetFontSize = measureTargetFontSize();
        // Nothing measurable yet -- mid-layout, or before the face has loaded.
        // Keep whatever scale is already on the mesh rather than dropping to a
        // fixed world height: on a phone that is how the word ended up larger
        // than the headline it is meant to be.
        if (!size.width || !size.height || !targetFontSize) return;
        const height = planeHeightForFontSize({
          textureCanvasWidthPx: textCanvas.width,
          textureCanvasHeightPx: textCanvas.height,
          hostWidthPx: size.width,
          hostHeightPx: size.height,
          targetFontSizePx: targetFontSize,
          textureFontSizePx: textFontSize,
        });
        const scale = height * planeScale;
        mesh.scale.set(scale, scale, 1);
      };

      const createTextTexture = () => {
        const font = headlineCanvasFont();
        textContext.font = font;
        const metrics = textContext.measureText(text);
        // The body is drawn behind the face, so the canvas has to make room
        // for it or the deepest layers would be clipped away. The layout
        // keeps that room equal on every side -- the body only ever trails
        // down-and-right from the face, so a margin sized to fit just that
        // reach put more empty canvas on the right and bottom than the left
        // and top, and it is the whole canvas a centred plane centres on
        // screen, not just the face drawn on it.
        const extrudeX = Math.max(0, textFontSize * extrudeDepth);
        const extrudeY = extrudeX * ASCII_EXTRUDE_RISE;
        const layout = textTextureLayout({
          inkLeftPx: metrics.actualBoundingBoxLeft,
          inkRightPx: metrics.actualBoundingBoxRight,
          ascentPx: metrics.actualBoundingBoxAscent,
          descentPx: metrics.actualBoundingBoxDescent,
          extrudeXPx: extrudeX,
          extrudeYPx: extrudeY,
        });
        textCanvas.width = layout.canvasWidth;
        textCanvas.height = layout.canvasHeight;
        textContext.font = font;

        const baseX = layout.baseX;
        const baseY = layout.baseY;
        const stepX = extrudeX / ASCII_EXTRUDE_LAYERS;
        const stepY = extrudeY / ASCII_EXTRUDE_LAYERS;

        // Back to front, so each layer covers the one behind it.
        for (let layer = ASCII_EXTRUDE_LAYERS; layer >= 1; layer -= 1) {
          const shade = extrudeLayerShade(layer, ASCII_EXTRUDE_LAYERS);
          textContext.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
          textContext.fillText(text, baseX + stepX * layer, baseY + stepY * layer);
        }

        textContext.fillStyle = "#ffffff";
        textContext.fillText(text, baseX, baseY);
        const nextTexture = new THREE.CanvasTexture(textCanvas);
        nextTexture.minFilter = THREE.NearestFilter;
        return nextTexture;
      };

      const buildMesh = () => {
        texture = createTextTexture();
        const aspect = textCanvas.width / textCanvas.height;
        material = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader,
          transparent: true,
          uniforms: {
            uTime: { value: 0 },
            uTexture: { value: texture },
            uEnableWaves: { value: enableWaves ? 1 : 0 },
            uCrtCurvature: { value: crtCurvature },
            uCrtScanlineIntensity: { value: CRT_SCANLINE_INTENSITY },
          },
        });
        // Built at unit height and scaled, so matching the font on resize
        // costs a scale write rather than a geometry rebuild.
        mesh = new THREE.Mesh(new THREE.PlaneGeometry(aspect, 1, 36, 36), material);
        scene.add(mesh);
        applyPlaneScale();
      };

      const refreshTextTexture = () => {
        const nextTexture = createTextTexture();
        const previousTexture = texture;
        texture = nextTexture;
        if (material) material.uniforms.uTexture.value = nextTexture;
        previousTexture?.dispose();
        applyPlaneScale();
      };

      const resize = () => {
        // Same reason as above: offsetWidth/Height, not the
        // rotation-sensitive getBoundingClientRect.
        const size = { width: host.offsetWidth, height: host.offsetHeight };
        if (!size.width || !size.height) return;
        renderer.setSize(size.width, size.height);
        camera.aspect = size.width / size.height;
        camera.updateProjectionMatrix();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        outputCanvas.width = Math.max(1, Math.floor(size.width * dpr));
        outputCanvas.height = Math.max(1, Math.floor(size.height * dpr));
        outputContext.setTransform(dpr, 0, 0, dpr, 0, 0);
        cellFontSize = asciiFontSizeForHost(asciiFontSize, size.width);
        pre.style.fontSize = `${cellFontSize}px`;
        outputContext.font = `${cellFontSize}px "IBM Plex Mono", ui-monospace, monospace`;
        outputContext.textBaseline = "top";
        characterWidth = outputContext.measureText("M").width || cellFontSize * 0.6;
        sampleCanvas.width = Math.max(1, Math.floor(size.width / characterWidth));
        sampleCanvas.height = Math.max(1, Math.floor(size.height / cellFontSize));
        applyPlaneScale();
      };

      const asciify = (now: number) => {
        const width = sampleCanvas.width;
        const height = sampleCanvas.height;
        sampleContext.clearRect(0, 0, width, height);
        sampleContext.drawImage(renderer.domElement, 0, 0, width, height);
        const pixels = sampleContext.getImageData(0, 0, width, height).data;
        let output = "";
        const burst = rainBurstRef.current;
        const burstElapsed = burst ? now - burst.startedAt : ASCII_REBUILD_TOTAL_MS + 1;
        const rebuild = asciiRebuildPhaseAt(burstElapsed);
        const burstActive = Boolean(burst && rebuild.phase !== "idle");
        outputCanvas.style.display = randomizeGlyphColors || burstActive ? "block" : "none";
        pre.style.opacity = !randomizeGlyphColors && burstActive ? "0" : "1";
        if (randomizeGlyphColors || burstActive) {
          // Same reason as above: offsetWidth/Height, not the
          // rotation-sensitive getBoundingClientRect.
          outputContext.clearRect(0, 0, host.offsetWidth, host.offsetHeight);
        }
        let inkMinX = width;
        let inkMaxX = 0;
        if (burstActive) {
          for (let index = 3; index < pixels.length; index += 4) {
            if (pixels[index] < 12) continue;
            const x = Math.floor((index / 4) % width);
            inkMinX = Math.min(inkMinX, x);
            inkMaxX = Math.max(inkMaxX, x);
          }
        }
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const index = (y * width + x) * 4;
            const alpha = pixels[index + 3];
            if (alpha < 12) {
              output += " ";
              continue;
            }
            const brightness = (pixels[index] * 0.3 + pixels[index + 1] * 0.6 + pixels[index + 2] * 0.1) / 255;

            // Matrix rain: the column decides when it starts, the row decides
            // how far down the stream has reached. Seeded apart from the
            // colour hash so the two do not correlate.
            const columnNoise = Math.sin(x * 3.7891 + 4.113) * 21374.221;
            const columnHash = columnNoise - Math.floor(columnNoise);
            const rowProgress = height > 1 ? y / (height - 1) : 0;
            const inkProgress = (x - inkMinX) / Math.max(1, inkMaxX - inkMinX);
            // The click determines where the rebuild begins, then nearby
            // columns join before the wave reaches the far side. A small
            // seeded offset keeps the front ragged rather than circular.
            const rebuildColumnOrder = burst
              ? Math.min(
                  1,
                  Math.abs(inkProgress - burst.originX) * 0.78 + columnHash * 0.22
                )
              : columnHash;
            const decompose = rebuild.phase === "decompose";
            const cell = rebuild.phase === "blank"
              ? "hidden"
              : asciiCellStateAt(
                  burstActive
                    ? decompose
                      ? 1 - rebuildColumnOrder
                      : rebuildColumnOrder
                    : columnHash,
                  burstActive && decompose ? 1 - rowProgress : rowProgress,
                  burstActive ? rebuild.progress : typeProgressRef.current
                );
            if (cell === "hidden") {
              output += " ";
              continue;
            }
            const character =
              cell === "churning"
                ? asciiJunkGlyph(columnHash + y * 0.137, churnTick)
                : CHARACTERS[Math.floor(brightness * (CHARACTERS.length - 1))];
            const colorNoise = Math.sin(x * 12.9898 + y * 78.233 + colorSeed) * 43758.5453;
            const colorChip = chipForBrightness(
              brightness,
              colorNoise - Math.floor(colorNoise)
            );
            const inRain = Boolean(
              burstActive &&
              (rebuild.phase === "decompose" || rebuild.phase === "rebuild") &&
              cell === "churning"
            );
            output += character;
            if (randomizeGlyphColors || burstActive) {
              // Same brightness that chose the glyph also chooses its colour,
              // so ink and hue describe one surface. The hash is a per-cell
              // nudge, stable across frames, that scatters the edge colours
              // without touching the lit face.
              // Churning cells cycle through the layered rain palette; once
              // they settle, the original face and depth colours take over.
              const rainLayer = Math.abs(Math.floor(columnHash * 997 + y + churnTick));
              const rainColors = ASCII_RAIN_PALETTE[rainLayer % ASCII_RAIN_PALETTE.length];
              outputContext.fillStyle = inRain
                ? rainColors.background
                : colorChip.background;
              outputContext.fillRect(x * characterWidth, y * cellFontSize, characterWidth, cellFontSize);
              outputContext.fillStyle = inRain
                ? rainColors.foreground
                : colorChip.foreground;
              outputContext.font = inRain
                ? `600 ${cellFontSize}px "IBM Plex Mono", ui-monospace, monospace`
                : `${cellFontSize}px "IBM Plex Mono", ui-monospace, monospace`;
              outputContext.fillText(
                character,
                x * characterWidth,
                y * cellFontSize + (inRain ? 0.8 : 0)
              );
            }
          }
          output += "\n";
        }
        if (!randomizeGlyphColors) pre.textContent = output;
      };

      let demoStart = performance.now();
      // Advances a few times a second so churning cells reshuffle their junk.
      let churnTick = 0;
      let pointerTaken = false;

      const onPointerMove = (event: PointerEvent) => {
        pointerTaken = true;
        const bounds = host.getBoundingClientRect();
        pointer.targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * tiltStrength;
        pointer.targetY =
          ((event.clientY - bounds.top) / bounds.height - 0.5) * -tiltStrength * ASCII_TILT_Y_RATIO;
      };

      const render = (time: number) => {
        if (disposed || !mesh || !material) return;
        if (!pointerTaken) {
          const swept = demoTiltAt(time - demoStart, demoTiltRef.current, tiltStrength);
          if (swept !== null) {
            pointer.targetX = swept;
            pointer.targetY = 0;
          } else {
            // The sweep itself never reverses mid-pass -- doing that read as
            // a boomerang -- but once it has landed there is no reason to
            // leave the plane tilted indefinitely with nobody hovering it.
            // A tilted plane on a perspective camera reads as smaller and
            // off-centre, not just angled, so relying on the handover fade to
            // hide that left the word looking wrong on a slow fade or a
            // screenshot caught mid-way. Settling back to level here is a
            // continuation of the same easing that drives the lean-in, not a
            // second, opposite move.
            pointer.targetX = 0;
            pointer.targetY = 0;
          }
        }
        pointer.x += (pointer.targetX - pointer.x) * 0.05;
        pointer.y += (pointer.targetY - pointer.y) * 0.05;
        mesh.rotation.x = pointer.y;
        mesh.rotation.y = pointer.x;
        churnTick = Math.floor(time / 55);
        material.uniforms.uTime.value = time * 0.001;
        renderer.render(scene, camera);
        asciify(time);
        frame = requestAnimationFrame(render);
      };

      buildMesh();
      resize();
      // Canvas text is rasterised at draw time. Redraw after Next's bundled
      // PP Frama face is ready so a fast fallback never gets baked into the
      // ASCII texture on a first visit.
      // Re-measure through resize rather than refreshing the texture alone:
      // the face landing changes the word's width, and the plane has to be
      // re-fitted to the frame with it.
      document.fonts?.ready.then(() => {
        if (disposed) return;
        refreshTextTexture();
        resize();
      }).catch(() => {});
      demoStart = performance.now();
      host.addEventListener("pointermove", onPointerMove);
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      host.dataset.ready = "true";
      frame = requestAnimationFrame(render);
      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        host.removeEventListener("pointermove", onPointerMove);
        mesh?.geometry.dispose();
        material?.dispose();
        texture?.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        pre.remove();
        outputCanvas.remove();
        renderer.domElement.remove();
      };
    });

    return () => {
      disposed = true;
      host.dataset.ready = "false";
      cleanup?.();
    };
  }, [asciiFontSize, crtCurvature, enableWaves, extrudeDepth, planeScale, randomizeGlyphColors, text, textFontSize, tiltStrength]);

  useEffect(() => () => {
    if (rainClearTimerRef.current) clearTimeout(rainClearTimerRef.current);
  }, []);

  const pointerPositionAt = (host: HTMLDivElement, clientX: number) => {
    const bounds = host.getBoundingClientRect();
    const wordStart = bounds.left + bounds.width * 0.07;
    const wordWidth = bounds.width * 0.86;
    const position = Math.min(0.999, Math.max(0, (clientX - wordStart) / wordWidth));
    return position;
  };

  const startRain = (host: HTMLDivElement, originX: number) => {
    rainBurstRef.current = { originX, startedAt: performance.now() };
    host.dataset.rainCycle = String(rainBurstRef.current.startedAt);
    host.dataset.rainPosition = originX.toFixed(3);
    host.dataset.raining = "word";
    if (rainClearTimerRef.current) clearTimeout(rainClearTimerRef.current);
    rainClearTimerRef.current = setTimeout(() => {
      rainBurstRef.current = null;
      host.dataset.raining = "false";
    }, ASCII_REBUILD_TOTAL_MS);
  };

  return (
    <div
      ref={hostRef}
      className={styles.root}
      data-testid="ascii-text"
      data-ready="false"
      data-crt="curved-scanline"
      data-glyph-colors={randomizeGlyphColors ? "random" : "gradient"}
      data-raining="false"
      data-rain-position="false"
      role="img"
      aria-label={text}
      onPointerDown={(event) => {
        if (
          !interactive ||
          event.button > 0 ||
          window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        ) return;
        startRain(event.currentTarget, pointerPositionAt(event.currentTarget, event.clientX));
      }}
    >
      <span className={styles.fallback} aria-hidden="true">{text}</span>
    </div>
  );
}
