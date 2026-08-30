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
