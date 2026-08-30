"use client";

import { PaperTexture } from "@paper-design/shaders-react";
import styles from "./SketchPaperShader.module.css";

// This is intentionally a static shader. The texture is part of the sketch's
// material, not an animated backdrop, so the underlying shader stops its rAF
// after its initial draw.
export function SketchPaperShader() {
  return (
    <div className={styles.root} data-testid="sketch-paper-shader" aria-hidden="true">
      <PaperTexture
        width="100%"
        height="100%"
        colorBack="#F5EDE6"
        colorFront="#B8A596"
        contrast={0.16}
        roughness={0.32}
        fiber={0.3}
        fiberSize={0.18}
        crumples={0.1}
        crumpleSize={0.38}
        folds={0.07}
        foldCount={3}
        drops={0.12}
        fade={0.14}
        seed={18.4}
        scale={0.58}
        fit="cover"
        speed={0}
        minPixelRatio={1}
        maxPixelCount={1_500_000}
      />
    </div>
  );
}
