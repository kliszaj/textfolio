export type PreviewPoint = { x: number; y: number };
export type PreviewSize = { width: number; height: number };

// The hover card's own fixed footprint. width matches the card's own
// min(18rem, ...) cap in InlineLinkPreview.module.css; height is a
// generous estimate (real height varies with whether a link has a preview
// image) -- both exist only to keep the card from running off an edge, not
// to size it exactly.
export const PREVIEW_CARD_WIDTH_PX = 288;
export const PREVIEW_CARD_HEIGHT_PX = 280;
export const PREVIEW_VIEWPORT_MARGIN_PX = 16;
// Clear of the cursor itself, not directly under it -- otherwise the card
// immediately steals the pointer and the link it belongs to re-triggers a
// leave/enter flicker.
export const PREVIEW_CURSOR_OFFSET_PX = 16;

// Keeps the hover card fully inside the viewport, however close to an edge
// the cursor (or the focused link, for keyboard use) happens to be.
export function clampPreviewPosition(
  point: PreviewPoint,
  viewport: PreviewSize,
  card: PreviewSize,
  margin: number
): PreviewPoint {
  const maxX = viewport.width - card.width - margin;
  const maxY = viewport.height - card.height - margin;
  return {
    x: Math.max(margin, Math.min(point.x, maxX)),
    y: Math.max(margin, Math.min(point.y, maxY)),
  };
}
