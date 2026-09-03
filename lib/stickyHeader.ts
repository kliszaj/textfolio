// The case-study header occupies real page flow. A generous "near top"
// threshold lets it expand while body copy is still behind it, so full height
// is an exact document-top state; every other scroll position uses the compact
// reading bar.

// The full header takes up real page flow. Expanding it anywhere except the
// document top would put the long read beneath it, so this is deliberately an
// exact state rather than a proximity threshold.
export function nextHeaderShrunk(currentY: number): boolean {
  return Math.max(0, currentY) > 0;
}
