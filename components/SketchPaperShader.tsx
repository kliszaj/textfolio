"use client";

import { PaperTexture } from "@paper-design/shaders-react";
import { DEFAULT_PAPER_TEXTURE_CONFIG } from "@/lib/paperTexture";
import type { PaperTextureConfig } from "@/lib/paperTexture";
import styles from "./SketchPaperShader.module.css";

// This is intentionally a static shader. The texture is part of the sketch's
// material, not an animated backdrop, so the underlying shader stops its rAF
// after its initial draw.
type SketchPaperShaderProps = {
  config?: PaperTextureConfig;
};

export function SketchPaperShader({ config = DEFAULT_PAPER_TEXTURE_CONFIG }: SketchPaperShaderProps) {
  return (
    <div
      className={styles.root}
      data-testid="sketch-paper-shader"
      aria-hidden="true"
      style={{ opacity: config.opacity }}
    >
      <PaperTexture
        width="100%"
        height="100%"
        colorBack={config.colorBack}
        colorFront={config.colorFront}
        contrast={config.contrast}
        roughness={config.roughness}
        fiber={config.fiber}
        fiberSize={config.fiberSize}
        crumples={config.crumples}
        crumpleSize={config.crumpleSize}
        folds={config.folds}
        foldCount={config.foldCount}
        drops={config.drops}
        fade={config.fade}
        seed={config.seed}
        scale={config.scale}
        fit="cover"
        speed={0}
        minPixelRatio={1}
        maxPixelCount={1_500_000}
      />
    </div>
  );
}
