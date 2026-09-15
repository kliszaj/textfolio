// The case-study header changes its real height in page flow. That resize can
// move window.scrollY, so treating every resulting scroll event as fresh user
// intent creates a collapse/expand feedback loop at the top of the page.
//
// Give the first wheel gesture room to move the document, then hold the chosen
// state while the height transition settles. Once compact, the header remains
// compact until the reader genuinely returns to the document top.
export const HEADER_SHRINK_AT_PX = 120;
export const HEADER_SETTLE_MS = 360;

export function nextHeaderShrunk({
  shrunk,
  currentY,
  sinceChangeMs,
}: {
  shrunk: boolean;
  currentY: number;
  sinceChangeMs: number;
}): boolean {
  if (sinceChangeMs < HEADER_SETTLE_MS) return shrunk;

  const normalizedY = Math.max(0, currentY);
  if (shrunk) return normalizedY > 0;
  return normalizedY > HEADER_SHRINK_AT_PX;
}
