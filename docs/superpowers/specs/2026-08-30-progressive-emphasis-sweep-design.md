# Progressive Emphasis Sweep — Design Spec

Date: 2026-08-30
Status: Approved by user, pending implementation
Supersedes: the hover-to-read focus mechanic added in `dd3a0fd`

## Problem

`dd3a0fd` introduced a hover-to-read focus state (`computeFocusedInset`,
`focused` / `focusedZIndex` / `onMouseEnter` / `onMouseLeave` on `PaperSheet`)
but never wired it up. Wiring it up exposed why it cannot work: focus was
driven by the cursor being *over* a sheet, while the focused geometry
(`bottom: 45%`, `zIndex: 50`) moves that sheet out from under the cursor.

At `fanProgress: 1` each case study is hoverable only in a thin band near the
bottom of the viewport (88-92%, 92-96%, 96-100%). Focusing shrinks the sheet
to the top 55% and lifts it above the hero, so the pointer is no longer inside
it: `mouseleave` fires, focus clears, the sheet animates back down, the pointer
is inside again, `mouseenter` fires. With a 280ms transition on `bottom`, the
result is a continuous strobe of a full-screen colour panel.

This is a positive feedback loop between layout and hit-testing. It is not
fixable by tuning constants, and JSDOM cannot catch it (no layout, no
hit-testing), so no unit test would have caught the regression.

## Concept

Replace discrete hover-focus with a single continuous **emphasis peak** that
travels down the stack as the cursor descends. Nothing is triggered by the
cursor being over a sheet, so the feedback loop cannot exist.

One cursor-Y value drives two sequential phases:

1. **Fan phase** — the stack fans open from flush to fully spread.
2. **Sweep phase** — a peak of emphasis glides from the top case study to the
   bottom one.

Emphasis is continuous per sheet (0-1), not a selection. Early in the sweep the
top two sheets share high weight; late in the sweep the bottom two do.

## Layout model: bands, not recedes

Sheets are full-bleed and anchored top-left, so a sheet's visible band is the
gap between its own bottom edge and the bottom edge of the sheet in front of it:

```
band(d) = bottom(d-1) - bottom(d)
```

Under the current `recedePercents: [12, 8, 4, 0]` every band is 4%. Making one
sheet's band thicker therefore requires editing its *neighbours*, which makes
"emphasis = more size" unexpressible.

The model is inverted. Each case-study sheet owns a **band thickness**; bottom
insets are derived as a cumulative sum from the back of the stack:

```
bottom(N)   = 0                            // backmost sheet stays flush
bottom(d-1) = bottom(d) + thickness(d)     // walk forward toward the hero
```

This is exactly equivalent to the old parameterization — `[12,8,4,0]` is
`thickness = [4,4,4]` summed — but emphasis now adds to one sheet's own
thickness, and the hero lifting further to make room falls out automatically.

`recedePercents: [number, number, number, number]` becomes
`bandPercents: number[]`, indexed by `depth - 1` (one entry per case study, no
hero entry). Tilt is a single `tiltStepDegrees` added per sheet down the
stack -- the hero takes the first step, so it is a sheet in the stack rather
than a fixed backdrop. The debug panel's four "recede" sliders become three "band"
sliders.

## Emphasis math

A triangular peak, in `lib/fanSheet.ts` alongside the existing pure functions:

```
peak      = 1 + sweepProgress x (N - 1)          // depth 1 -> depth N
weight(d) = max(0, 1 - |d - peak| / falloff)     // 0 for d < 1 (never the hero)
```

`N` is the case-study count; `falloff` is the peak width in sheet units.
At `falloff = 1.5`, N = 3:

| sweepProgress | sheet 1 | sheet 2 | sheet 3 |
|---|---|---|---|
| 0.0 | 1.00 | 0.33 | 0    |
| 0.5 | 0.33 | 1.00 | 0.33 |
| 1.0 | 0    | 0.33 | 1.00 |

The hero (depth 0) always has weight 0 — it is never emphasized.

## The three emphasis channels

All three read from that single weight:

- **Size** — `thickness(d) = (bandPercents[d-1] + weight(d) x emphasisBonusPercent) x fanProgress`
- **Content** — the blurb's opacity ramps in as weight climbs:
  `blurbOpacity = clamp((weight - 0.35) / 0.4, 0, 1)`. The title stays fully
  visible throughout, as it does today.
- **Depth cues** — brightness lerps toward 1:

  ```
  base       = 1 - depth x brightnessFalloff
  brightness = base + (1 - base) x weight
  ```

At `weight = 1` this produces full brightness — what `computeFocusedInset`
returned, so it and `focusRevealPercent` are deleted rather than replaced.

**Tilt is deliberately not an emphasis channel.** An earlier revision folded
the weight into the angle (`rotate x (1 - weight)`), which rocks a sheet one
way and back as the peak crosses it -- a visible see-saw. Tilt therefore
depends only on depth and `fanProgress`:

```
rotate = tiltStepDegrees x (depth + 1) x fanProgress
```

Monotonic in `fanProgress`, constant across the sweep, so the gesture is a
single unreversing rotation. `transform-origin` is `bottom left` rather than
`bottom center`: a centre pivot drops one half of a sheet as the other rises,
while a corner pivot swings the whole sheet up and to the left.

The blurb is always rendered and dimmed by opacity, never conditionally
mounted. It carries no `aria-hidden`: `app/page.test.tsx` distinguishes the
touch scroll-spacer by `[aria-hidden="true"]`, and screen readers benefit from
reaching every blurb regardless of emphasis.

## Travel budget

Cursor distance from the bottom edge normalizes to a single `travel` value
(0-1) across `thresholdPx`, then splits at `fanSplit`:

```
fanProgress   = clamp(travel / fanSplit, 0, 1)
sweepProgress = clamp((travel - fanSplit) / (1 - fanSplit), 0, 1)
```

`lib/fanProgress.ts` renames `computeCursorFanProgress` / `computeScrollFanProgress`
to `computeCursorTravel` / `computeScrollTravel` and gains `splitTravel`.
`useFanProgress` returns `{ fanProgress, sweepProgress }` instead of a number.

Defaults: `thresholdPx: 450` (up from 250 — one gesture now does two jobs),
`fanSplit: 0.45`.

Touch is unchanged in structure: scroll position produces the same `travel`
value and feeds the identical split, preserving the constraint that desktop and
touch differ only in what produces the number.

## Motion

`transitionMs` drops from 280 to 40. The 280ms transition was built for
discrete state changes; under continuous cursor tracking every `mousemove`
restarts it, so sheets chase the cursor a third of a second behind. Continuous
cursor-driven motion takes its continuity from the cursor itself. The slider
stays for tuning.

## Shadows and the backdrop

Each sheet carries `box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28)`, dropped onto
the sheet behind it so the fanned bands read as separate pieces of paper.

Tilting swings each sheet's far bottom corner upward, which behind the last
sheet would expose the cream page itself as a wedge. The stack therefore sits
on a backdrop painted in the backmost case study's colour, carrying that
sheet's brightness so the seam falls on matching paint.

## Typography

Self-hosted through `next/font/local` from `app/fonts/`, replacing the
`next/font/google` Archivo Black and Caveat:

- `--font-display` -> `PPFrama-Black.otf` (the "ADRIAN" headline)
- `--font-script` -> `Adrian-Regular.otf` (the handwritten tagline)

## Stacking

Z-indices stay frozen at `[40, 30, 20, 10]`. Emphasis never reorders sheets and
no sheet ever rises above the hero. `focusedZIndex` is deleted.

## What gets removed

- `computeFocusedInset` and `focusRevealPercent` (`lib/fanSheet.ts`)
- `focused`, `focusedZIndex`, `onMouseEnter`, `onMouseLeave` (`PaperSheet`)
- `focusedDepth` state and the `usePointerType` focus gate (`PaperStack`)
- The `focused` boolean prop on `CaseStudyPreview`, replaced by `emphasis: number`

No component listens for pointer-enter/leave on a sheet after this change.

## Testing

Every mechanic is a pure function over numbers, so the whole model is unit
testable — which the hover model was not:

- `lib/fanSheet.test.ts` — `computeEmphasis` peak position, falloff shape,
  hero always 0, and the three channels at representative weights
- `lib/fanProgress.test.ts` — `splitTravel` boundaries: below split (sweep 0),
  at split (fan 1, sweep 0), above split, clamping at both ends
- `hooks/useFanProgress.test.ts` — returns both values off mousemove and scroll
- Component tests — assert inline styles at given `fanProgress` / `sweepProgress`,
  and that the blurb's opacity tracks emphasis

Interaction feel (sweep timing, whether `falloff` reads as liquid or snappy)
is verified manually in a browser by the user, per the original spec's testing
approach.

## Debug panel

Sliders: per-depth band thickness (3), emphasis bonus, emphasis falloff,
brightness falloff, transition ms, threshold px, fan split. The mechanic toggle
(Bottom Peek / Corner Cascade) stays.

## Out of scope

- The unwired `subheaderRef` on `Hero` from `dd3a0fd`.
- Real case-study content and letter-treatment videos.
