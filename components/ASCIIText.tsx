"use client";

import { useEffect, useRef } from "react";
import {
  ASCII_CAMERA_DISTANCE,
  ASCII_CAMERA_FOV_DEG,
  ASCII_TILT_Y_RATIO,
  DEFAULT_ASCII_TEXT_CONFIG,
  chipForBrightness,
  planeHeightForFontSize,
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
void main() {
  // A fixed chromatic split. It fringes the glyph edges, which is what gives
  // the depth ramp an edge to colour -- driving it off time instead made the
  // whole treatment shimmer.
  vec2 split = vec2(0.006, 0.0);
  float r = texture2D(uTexture, vUv + split).r;
  float g = texture2D(uTexture, vUv).g;
  float b = texture2D(uTexture, vUv - split).b;
  float a = texture2D(uTexture, vUv).a;
  gl_FragColor = vec4(r, g, b, a);
}`;

const CHARACTERS = " .`^\\\",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
type ASCIITextProps = ASCIITextConfig & {
  text: string;
  // How much of the word has typed in, 0-1. Held in a ref rather than a
  // dependency: it changes every frame, and rebuilding the WebGL context per
  // frame would be catastrophic.
  revealFraction?: number;
};

export function ASCIIText({
  text,
  enableWaves = DEFAULT_ASCII_TEXT_CONFIG.enableWaves,
  asciiFontSize = DEFAULT_ASCII_TEXT_CONFIG.asciiFontSize,
  textFontSize = DEFAULT_ASCII_TEXT_CONFIG.textFontSize,
  planeScale = DEFAULT_ASCII_TEXT_CONFIG.planeScale,
  tiltStrength = DEFAULT_ASCII_TEXT_CONFIG.tiltStrength,
  randomizeGlyphColors = DEFAULT_ASCII_TEXT_CONFIG.randomizeGlyphColors,
  revealFraction = 1,
}: ASCIITextProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef(revealFraction);

  useEffect(() => {
    revealRef.current = revealFraction;
  }, [revealFraction]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === "undefined" || typeof WebGLRenderingContext === "undefined") return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    void import("three").then((THREE) => {
      if (disposed) return;
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const textCanvas = document.createElement("canvas");
      const textContext = textCanvas.getContext("2d");
      const sampleCanvas = document.createElement("canvas");
      const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
      if (!textContext || !sampleContext) return;

      const pre = document.createElement("pre");
      pre.style.fontSize = `${asciiFontSize}px`;
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

      // Sized to match the font rather than to a fixed world height, because
      // the headline grows with the viewport while its container stops at a
      // clamp -- so the ratio between them is not constant.
      const applyPlaneScale = () => {
        if (!mesh) return;
        const size = host.getBoundingClientRect();
        const height = planeHeightForFontSize({
          textureCanvasHeightPx: textCanvas.height,
          hostHeightPx: size.height,
          targetFontSizePx: measureTargetFontSize(),
          textureFontSizePx: textFontSize,
        });
        const scale = height * planeScale;
        mesh.scale.set(scale, scale, 1);
      };

      const createTextTexture = () => {
        textContext.font = `900 ${textFontSize}px "PP Frama", sans-serif`;
        const metrics = textContext.measureText(text);
        textCanvas.width = Math.ceil(metrics.width) + 40;
        textCanvas.height = Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) + 40;
        textContext.font = `900 ${textFontSize}px "PP Frama", sans-serif`;
        textContext.fillStyle = "#ffffff";
        textContext.fillText(text, 20, 20 + metrics.actualBoundingBoxAscent);
        texture = new THREE.CanvasTexture(textCanvas);
        texture.minFilter = THREE.NearestFilter;
      };

      const buildMesh = () => {
        createTextTexture();
        const aspect = textCanvas.width / textCanvas.height;
        material = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader,
          transparent: true,
          uniforms: { uTime: { value: 0 }, uTexture: { value: texture }, uEnableWaves: { value: enableWaves ? 1 : 0 } },
        });
        // Built at unit height and scaled, so matching the font on resize
        // costs a scale write rather than a geometry rebuild.
        mesh = new THREE.Mesh(new THREE.PlaneGeometry(aspect, 1, 36, 36), material);
        scene.add(mesh);
        applyPlaneScale();
      };

      const resize = () => {
        const size = host.getBoundingClientRect();
        if (!size.width || !size.height) return;
        renderer.setSize(size.width, size.height);
        camera.aspect = size.width / size.height;
        camera.updateProjectionMatrix();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        outputCanvas.width = Math.max(1, Math.floor(size.width * dpr));
        outputCanvas.height = Math.max(1, Math.floor(size.height * dpr));
        outputContext.setTransform(dpr, 0, 0, dpr, 0, 0);
        outputContext.font = `${asciiFontSize}px "IBM Plex Mono", ui-monospace, monospace`;
        outputContext.textBaseline = "top";
        characterWidth = outputContext.measureText("M").width || asciiFontSize * 0.6;
        sampleCanvas.width = Math.max(1, Math.floor(size.width / characterWidth));
        sampleCanvas.height = Math.max(1, Math.floor(size.height / asciiFontSize));
        applyPlaneScale();
      };

      const asciify = () => {
        const width = sampleCanvas.width;
        const height = sampleCanvas.height;
        sampleContext.clearRect(0, 0, width, height);
        sampleContext.drawImage(renderer.domElement, 0, 0, width, height);
        const pixels = sampleContext.getImageData(0, 0, width, height).data;
        let output = "";
        if (randomizeGlyphColors) {
          const bounds = host.getBoundingClientRect();
          outputContext.clearRect(0, 0, bounds.width, bounds.height);
        }
        // Typed in column by column, which is how ascii wants to arrive.
        const revealed = Math.ceil(
          width * Math.min(1, Math.max(0, revealRef.current))
        );
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            if (x >= revealed) {
              output += " ";
              continue;
            }
            const index = (y * width + x) * 4;
            const alpha = pixels[index + 3];
            if (alpha < 12) {
              output += " ";
              continue;
            }
            const brightness = (pixels[index] * 0.3 + pixels[index + 1] * 0.6 + pixels[index + 2] * 0.1) / 255;
            const character = CHARACTERS[Math.floor(brightness * (CHARACTERS.length - 1))];
            output += character;
            if (randomizeGlyphColors) {
              // Same brightness that chose the glyph also chooses its colour,
              // so ink and hue describe one surface. The hash is a per-cell
              // nudge, stable across frames, that scatters the edge colours
              // without touching the lit face.
              const noise = Math.sin(x * 12.9898 + y * 78.233 + colorSeed) * 43758.5453;
              const colorChip = chipForBrightness(brightness, noise - Math.floor(noise));
              outputContext.fillStyle = colorChip.background;
              outputContext.fillRect(x * characterWidth, y * asciiFontSize, characterWidth, asciiFontSize);
              outputContext.fillStyle = colorChip.foreground;
              outputContext.fillText(character, x * characterWidth, y * asciiFontSize);
            }
          }
          output += "\n";
        }
        if (!randomizeGlyphColors) pre.textContent = output;
      };

      const onPointerMove = (event: PointerEvent) => {
        const bounds = host.getBoundingClientRect();
        pointer.targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * tiltStrength;
        pointer.targetY =
          ((event.clientY - bounds.top) / bounds.height - 0.5) * -tiltStrength * ASCII_TILT_Y_RATIO;
      };

      const render = (time: number) => {
        if (disposed || !mesh || !material) return;
        pointer.x += (pointer.targetX - pointer.x) * 0.05;
        pointer.y += (pointer.targetY - pointer.y) * 0.05;
        mesh.rotation.x = pointer.y;
        mesh.rotation.y = pointer.x;
        material.uniforms.uTime.value = time * 0.001;
        renderer.render(scene, camera);
        asciify();
        frame = requestAnimationFrame(render);
      };

      buildMesh();
      resize();
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
  }, [asciiFontSize, enableWaves, planeScale, randomizeGlyphColors, text, textFontSize, tiltStrength]);

  return (
    <div ref={hostRef} className={styles.root} data-testid="ascii-text" data-ready="false" role="img" aria-label={text}>
      <span className={styles.fallback} aria-hidden="true">{text}</span>
    </div>
  );
}
