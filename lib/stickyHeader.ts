// The case study header shrinks as you read down. Its height is part of the
// page flow, so every change moves the content under the reader -- the browser
// reports that as a scroll, which flips the header straight back, which moves
// the content again. A single threshold turned that into a visible flutter.
//
// Two things stop it: the header only changes on a movement the reader plainly
// meant, and it ignores whatever arrives while it is still resizing.

// How far down the page the header may start shrinking at all.
export const HEADER_SHRINK_AT_PX = 140;
// Back within this of the top, the header is always full, whatever the gesture.
export const HEADER_EXPAND_AT_PX = 60;
// Movement below this is jitter, not intent.
export const HEADER_COMMIT_PX = 10;
// Covers the height transition, so the resize cannot answer itself.
export const HEADER_SETTLE_MS = 360;

export function nextHeaderShrunk({
  shrunk,
  previousY,
  currentY,
  sinceChangeMs,
}: {
  shrunk: boolean;
  previousY: number;
  currentY: number;
  sinceChangeMs: number;
}): boolean {
  if (currentY <= HEADER_EXPAND_AT_PX) return false;
  if (sinceChangeMs < HEADER_SETTLE_MS) return shrunk;

  const delta = currentY - previousY;
  // Committing to scroll up shows the whole header, wherever you are.
  if (delta <= -HEADER_COMMIT_PX) return false;
  if (delta >= HEADER_COMMIT_PX && currentY > HEADER_SHRINK_AT_PX) return true;
  return shrunk;
}
