import {
  HEADER_COMMIT_PX,
  HEADER_EXPAND_AT_PX,
  HEADER_SETTLE_MS,
  HEADER_SHRINK_AT_PX,
  nextHeaderShrunk,
} from "./stickyHeader";

const settled = HEADER_SETTLE_MS + 1;

test("keeps the header full near the top of the page", () => {
  expect(
    nextHeaderShrunk({ shrunk: true, previousY: 400, currentY: 20, sinceChangeMs: settled })
  ).toBe(false);
});

test("shrinks once the reader is well down and still going down", () => {
  expect(
    nextHeaderShrunk({
      shrunk: false,
      previousY: HEADER_SHRINK_AT_PX + 40,
      currentY: HEADER_SHRINK_AT_PX + 90,
      sinceChangeMs: settled,
    })
  ).toBe(true);
});

test("does not shrink on the way down until past the threshold", () => {
  expect(
    nextHeaderShrunk({
      shrunk: false,
      previousY: HEADER_EXPAND_AT_PX + 5,
      currentY: HEADER_SHRINK_AT_PX - 5,
      sinceChangeMs: settled,
    })
  ).toBe(false);
});

test("shows the whole header the moment the reader commits to scrolling up", () => {
  expect(
    nextHeaderShrunk({ shrunk: true, previousY: 900, currentY: 820, sinceChangeMs: settled })
  ).toBe(false);
});

test("ignores jitter smaller than a deliberate movement", () => {
  // A page that shifts a pixel or two under the reader must not flip anything.
  const nudge = HEADER_COMMIT_PX - 1;
  expect(
    nextHeaderShrunk({ shrunk: true, previousY: 900, currentY: 900 - nudge, sinceChangeMs: settled })
  ).toBe(true);
  expect(
    nextHeaderShrunk({ shrunk: false, previousY: 900, currentY: 900 + nudge, sinceChangeMs: settled })
  ).toBe(false);
});

test("ignores everything while the header is still resizing", () => {
  // This is the loop: the height change moves the page, the browser calls that
  // a scroll, and the header answers its own resize.
  expect(
    nextHeaderShrunk({ shrunk: true, previousY: 900, currentY: 700, sinceChangeMs: 10 })
  ).toBe(true);
  expect(
    nextHeaderShrunk({ shrunk: false, previousY: 700, currentY: 900, sinceChangeMs: 10 })
  ).toBe(false);
});

test("cannot flutter: a resize-sized jump each way settles instead of alternating", () => {
  let shrunk = true;
  let y = 900;
  // A height change of ~150px, reported as a scroll, immediately after a flip.
  for (let step = 0; step < 6; step += 1) {
    const previousY = y;
    y += step % 2 === 0 ? -150 : 150;
    shrunk = nextHeaderShrunk({ shrunk, previousY, currentY: y, sinceChangeMs: 20 });
  }
  expect(shrunk).toBe(true);
});
