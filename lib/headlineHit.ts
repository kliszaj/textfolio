// The headline frame runs most of the page width so it can size every
// treatment, but only the word itself should answer to the cursor. Hovering
// the empty frame either side of ADRIAN used to change the treatment.

export type HitPoint = { x: number; y: number };
export type WordBox = { left: number; right: number; top: number; bottom: number };

// Air around the letters, as a share of the word's height -- so it grows and
// shrinks with the headline rather than being a fixed pixel margin.
export const HEADLINE_HIT_PADDING_SHARE = 0.18;

export function isOverHeadline(
  point: HitPoint,
  word: WordBox,
  paddingShare: number = HEADLINE_HIT_PADDING_SHARE
): boolean {
  const height = word.bottom - word.top;
  const width = word.right - word.left;
  // Nothing measured yet: fall back to the frame, rather than leaving the
  // headline unable to respond at all.
  if (height <= 0 || width <= 0) return true;

  const pad = height * paddingShare;
  return (
    point.x >= word.left - pad &&
    point.x <= word.right + pad &&
    point.y >= word.top - pad &&
    point.y <= word.bottom + pad
  );
}

// The subheader shares the headline's own touch target: hovering either one
// answers to the cursor the same way, so this is what feeds isOverHeadline
// once both boxes are known.
export function unionBox(a: WordBox, b: WordBox | undefined): WordBox {
  if (!b) return a;
  return {
    left: Math.min(a.left, b.left),
    right: Math.max(a.right, b.right),
    top: Math.min(a.top, b.top),
    bottom: Math.max(a.bottom, b.bottom),
  };
}
