export type PaperTextureConfig = {
  colorBack: string;
  colorFront: string;
  opacity: number;
  contrast: number;
  roughness: number;
  fiber: number;
  fiberSize: number;
  crumples: number;
  crumpleSize: number;
  folds: number;
  foldCount: number;
  drops: number;
  fade: number;
  seed: number;
  scale: number;
};

// These are deliberately conservative. The word is a graphite drawing on
// paper, not a crumpled-paper demo, so every material control starts low.
export const DEFAULT_PAPER_TEXTURE_CONFIG: PaperTextureConfig = {
  colorBack: "#FFFFFF",
  colorFront: "#E3E3E3",
  opacity: 1,
  contrast: 0.16,
  roughness: 0.32,
  fiber: 0.3,
  fiberSize: 0.18,
  crumples: 0.1,
  crumpleSize: 0.38,
  folds: 0.07,
  foldCount: 3,
  drops: 0.12,
  fade: 0.14,
  seed: 18.4,
  scale: 0.58,
};

// The headline rises by a viewport-relative amount as the paper stack opens.
// Move the repeating sketch-paper grid by that same amount so the drawing
// remains registered to its paper instead of sliding over a fixed texture.
export function sketchBackgroundPosition(liftPercent: number): string {
  const safeLift = Number.isFinite(liftPercent) ? liftPercent : 0;
  return `0px calc(0px - ${safeLift}vh)`;
}

// The cool-S and lightning bolt are drawn in the corners of the same sheet
// as the headline, not stuck to the viewport above it -- without this they
// stayed put as the page rose, breaking the one illusion the whole treatment
// is built on. Same upward carry as the paper texture itself, layered under
// each mark's own fixed tilt (translate first, so the tilt still turns
// around the mark's own centre rather than the page's).
export function sketchMarkTransform(liftPercent: number, rotateDeg: number): string {
  const safeLift = Number.isFinite(liftPercent) ? liftPercent : 0;
  return `translateY(calc(0px - ${safeLift}vh)) rotate(${rotateDeg}deg)`;
}
