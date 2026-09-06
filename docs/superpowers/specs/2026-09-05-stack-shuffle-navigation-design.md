# Stack Shuffle Navigation — Design Spec

Date: 2026-09-05
Status: Approved by user, pending implementation

## Problem

Jumping to a case study from the page-indicator rail (or returning home from
one) currently ignores the stack's own geometry:

- **Forward.** Clicking a dot calls `liftCaseStudy(caseStudy)`, which zooms
  `CaseStudyFocus` in from `focusOriginRef.current` — wherever the click
  happened to land in the rail. The stack itself never opens; the case
  study just appears to bloom out of the indicator, with no connection to
  where that page actually lives in the stack.
- **Reverse.** Leaving a case study calls `markReturningHome()`, and
  `useStackCollapse` always starts the stack at `travel = 1` (fully open,
  which — per `computeEmphasis`'s peak formula — always emphasizes the
  *last* sheet) and collapses it to 0, regardless of which case study was
  actually being viewed.

The ask: make both directions read as physically finding a specific page in
the stack, not a generic zoom or a full-stack reset.

## Concept

The fan mechanic already expresses "this one sheet is found": pointing
`sweepProgress`'s emphasis peak at a depth already gives that sheet full
band width and full brightness (see `computeEmphasis`/`computeReveal` in
`lib/fanSheet.ts`). Neither direction needs new highlight logic — both need
the *existing* `fanProgress`/`sweepProgress` state driven to (or from) the
travel value that lands the peak on a specific depth, instead of on
whatever a live gesture or a fixed constant happens to produce.

Two new pure helpers in `lib/fanProgress.ts` carry both directions:

```ts
// The inverse of splitTravel: reconstructs the single travel scalar from
// the two phases it was split into, so a shuffle can start from wherever
// the stack actually is right now.
export function combineTravel(fanProgress: number, sweepProgress: number, fanSplit: number): number

// The travel value whose emphasis peak lands exactly on `depth` (1-indexed,
// matching PaperStack's own depth numbering — the hero is depth 0).
export function travelForDepth(depth: number, sheetCount: number, fanSplit: number): number
```

`travelForDepth` is derived by inverting the peak formula in
`computeEmphasis`: `sweepProgress = (depth - 1) / (sheetCount - 1)`, then
`travel = fanSplit + sweepProgress * (1 - fanSplit)`.

## Forward: shuffle-to-reveal, then lift

**Trigger.** A new `onJumpToCaseStudy` prop, threaded
`PaperStack → Hero → PageIndicator`'s `onSelect`. This is additive:
`onSelectCaseStudy` already reaches `PageIndicator` and the on-stack
`CaseStudyPreview` sheets through separate prop paths (both currently fed
by the same function from `app/page.tsx`, but structurally independent).
Direct clicks on an already-fanned sheet keep today's behavior — an
immediate lift from the real click position — untouched.

**Sequence**, driven by a new `useStackShuffle` hook (`hooks/useStackShuffle.ts`,
mirroring the rAF-tween shape of `useStackCollapse`):

1. On trigger, capture the stack's current travel via `combineTravel`, and
   the target travel via `travelForDepth(depth, sheetCount, fanSplit)`.
2. **Opening** (700ms): tween travel from current → target, smoothstep
   eased (same curve `useStackCollapse` already uses). Real pointer/scroll
   input is disabled for the duration (`useFanProgress`'s existing `enabled`
   flag), and `suppressHeadlineHover` is extended to also fire during this
   phase, so nothing fights the programmatic motion.
3. **Holding** (180ms): travel pinned at the target value — the "found it"
   beat.
4. **Arrived**: fires an `onArrived` callback. `app/page.tsx` measures the
   revealed sheet's real screen position — every sheet already carries a
   stable `data-testid="paper-sheet-{depth}"` — converts its center to the
   `{xPercent, yPercent}` shape `CaseStudyFocus` already expects (the same
   conversion `rememberOrigin` already does for a real click), and calls
   the existing `liftCaseStudy(caseStudy, origin)`. From here on, nothing
   about the lift itself changes.

A second dot click while a shuffle is in flight is ignored until the
current one resolves (checked at the trigger, not by disabling the dots'
own interactivity) — this needs no extra plumbing beyond that guard:
`PageIndicator`'s own opacity already fades to 0 as `fanProgress` reaches 1
(`opacity = 1 - min(1, fanProgress * 2)`), which happens almost immediately
once a shuffle starts opening the stack, so the rail is already visually
and functionally out of the way for the rest of the sequence — exactly as
it is during any ordinary open-the-stack gesture today. Keyboard (Enter)
selection goes through the exact same `onJumpToCaseStudy` path as a click,
so it gets the same animation.

Because `HomePage` unmounts on the `router.push` at the end of the lift,
`useStackShuffle`'s state needs no explicit reset — it dies with the page.

## Reverse: collapse from where you actually were

`markReturningHome` gains a required argument:

```ts
export function markReturningHome(slug: string): void
```

`CaseStudyView`'s `leave()` already has `caseStudy` in scope, so this is a
one-line change at the call site. The module-level flag becomes
`returningFrom: string | null` instead of a bare boolean.

`useStackCollapse` gains `sheetCount` and `fanSplit` parameters, looks up
the departing case study's depth (same ordering as `PaperStack`:
`[...caseStudies, ABOUT_PAGE]`, 1-indexed), and starts its tween at
`travelForDepth(depth, sheetCount, fanSplit)` instead of the current fixed
`1`. It still collapses to `null` (pointer ownership) over a fixed 700ms —
duration does not scale with distance, and there is no hold at the start;
per your call, coming home should feel prompt, and a card near the top of
the stack now simply has less distance to travel in the same time, which
is exactly the "lighter" collapse you asked for.

If the flag is unset (e.g. a hot reload, or a slug that no longer matches
any case study — defensive, not expected in practice) `useStackCollapse`
falls back to today's behavior: start at `1`.

## Testing

- `combineTravel` and `travelForDepth`: pure functions, unit-tested
  directly in `lib/fanProgress.test.ts` (round-trip with `splitTravel`,
  boundary depths, `fanSplit` at 0/1).
- `useStackShuffle`: rAF/timer-driven, tested the same way
  `useStackCollapse.test.ts` and `useFanProgress.test.ts` already are
  (fake timers, incremental `advanceTimersByTime`).
- `useStackCollapse`: existing tests updated for the new starting-travel
  behavior; a new test confirms a low-depth case study starts (and stays)
  below `1`.
- `app/page.tsx` wiring: an integration-level test confirming a page-indicator
  click leads to `case-study-focus` appearing with an origin derived from
  the revealed sheet's position, not a fixed click point.

## Out of scope

- `CaseStudyView`'s own exit slide (`EXIT_ANIMATION_MS`, `translateY(100vh)`)
  is unrelated to stack geometry and is not touched.
- Mobile: `PageIndicator` is already hidden below `lg`, so this interaction
  only exists on desktop; no separate mobile design is needed.
- No new visual language (glow, outline, etc.) is added to mark the
  "found" sheet — the existing emphasis (band width + brightness) already
  does that job.
