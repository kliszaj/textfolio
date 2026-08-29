# Paper-Stack Portfolio — Design Spec

Date: 2026-08-29
Status: Approved by user, pending implementation plan

## Concept

A designer portfolio for "Adrian" built as an analog of a stack of paper. The
landing page (the name "ADRIAN") is the top sheet (Z0). A handful of
case-study "papers" sit beneath it. Moving the cursor toward the bottom of
the viewport (or, on touch, scrolling) fans the stack out sideways like a
hand of cards; clicking a fanned card navigates to that case study as a real
page.

Independently, hovering (or tapping, on touch) each letter of "ADRIAN" swaps
the whole word's rendering to a different pre-made video treatment (chrome
liquid metal, 3D lego blocks, etc.), and the page background crossfades to
match that treatment's color.

These two mechanics are independent systems that happen to share one canvas
(the `/` route): the name-hover system lives entirely on the Z0 paper; the
fan-out system operates on the stack as a whole, driven by cursor Y-position
(desktop) or scroll position (touch).

## Tech stack

- **Next.js 14, App Router, TypeScript** — real per-case-study routes with
  working browser back/forward, per user decision.
- **Framer Motion** as the single animation library. It covers springs,
  layout animation, and gesture/drag primitives, which is enough for both
  the letter crossfade and the stack's fan physics — no need to also bring
  in GSAP and maintain two overlapping animation systems.
- **Tailwind CSS** for layout and utility styling. Bespoke visual treatments
  (the cream background, the display type, the hand-drawn arrow) are custom
  CSS/SVG, not Tailwind defaults.
- Deployment target not yet decided; out of scope for this spec.

## Visual baseline (idle state)

Matches the reference mockup provided by the user:

- Warm cream background (sample exact hex from the reference image when
  implementing, roughly `#F2EBE1`).
- "ADRIAN" set in a bold, heavy black geometric sans display face, large and
  centered.
- A handwritten/script-style tagline beneath it (e.g. "Designer, tinkerer,
  idea-booster" — placeholder copy, real copy TBD by user).
- A small hand-drawn down-arrow, centered beneath the tagline, hinting that
  there is more to discover by moving toward the bottom of the viewport.

## Data model

### Letter treatments (`data/letterTreatments.ts`)

Position-indexed, **not** letter-indexed — "ADRIAN" has two A's (position 0
and position 4), and they may carry different treatments:

```ts
type LetterTreatment = {
  position: number;      // 0-5, index into "ADRIAN"
  letter: string;        // the character at this position, for display/hit-zone labeling
  videoSrc: string;      // path to the treatment video (or placeholder color block)
  bgColor: string;       // page background color to crossfade to while this is active
  label: string;         // human-readable name of the treatment, e.g. "chrome liquid metal"
};
```

Six entries, one per letter position in "ADRIAN". For the current build, all
six `videoSrc` values point at solid-color placeholder blocks (a small
looping video or CSS color, doesn't matter which, as long as it's driven by
this same config) rather than real Weave-generated videos. `focals.mp4` and
`jam.mp4` are not wired into this config for now since they don't correspond
to specific letters — they stay unused until the user tells us which letters
they map to.

### Case studies (`data/caseStudies.ts`)

```ts
type CaseStudy = {
  slug: string;
  title: string;
  thumbnail: string;   // placeholder image path for now
  blurb: string;       // short teaser shown on the fanned card
};
```

3-4 placeholder entries. Each also gets a placeholder full-page body when
rendered at its route — real content to be swapped in later.

## Component breakdown

### `app/page.tsx` — the stack

Renders, in DOM/z-order:

1. `<Hero />` — the Z0 paper, containing the name-hover system.
2. `<PaperStack />` — the 3-4 case-study cards, positioned beneath the hero
   in z-index, whose transforms are driven by fan progress.

### `Hero` — name-hover system

- Displays "ADRIAN" as six individually-hoverable `<span>`s inside one
  fixed-size container sized to the whole word's bounding box. Each span's
  hit-zone is padded beyond its glyph so adjacent letters don't fight for
  hover (per the user's "draggable spaces" phrasing — generous, forgiving
  hit targets).
- A single `<video>` element is absolutely positioned over that same
  container: `muted`, `loop`, `playsInline`. Its `src` swaps to the active
  letter position's `videoSrc`.
- On hover-enter of a letter span (desktop) or tap (touch, see below):
  opacity-crossfade the video in over the static text (~150-250ms), and
  crossfade the page's background-color to that treatment's `bgColor`
  (CSS transition on a background layer, not the video itself).
- On hover-leave (desktop): crossfade back to the static word and the
  default cream background.
- **Preloading**: all six videos are rendered hidden (`opacity: 0`,
  `position: absolute`, off the layout flow) and set to `preload="auto"` on
  mount, so the first hover doesn't stall waiting for a video to buffer.
- **Touch behavior** (`(pointer: coarse)` media query, or equivalent
  JS check): no hover exists, so instead the six treatments **auto-cycle on
  a timer** (a few seconds each), continuously looping through all six while
  the hero is in view — a passive showcase rather than an interactive one.
  This timer should pause if the hero scrolls out of view (see fan-out
  below) to avoid wasted work.
- **Down-arrow hint**: fades out as fan progress (see below) rises above
  a small threshold, since at that point the user has already discovered
  the stack beneath.

### `PaperStack` + fan-out mechanic

- Renders 3-4 `<PaperCard>`s, each showing a case study's thumbnail/title,
  stacked directly beneath the hero with a slight default offset (so the
  edges peek out even at rest, hinting there's a stack).
- A single **fan progress** value, `0` (fully stacked) to `1` (fully fanned),
  drives every card's transform via Framer Motion: horizontal x-offset
  (spread), a small rotation, and a small y-lift, each scaled by the card's
  index in the stack, producing a fanned-hand-of-cards look. The mapping
  from fan progress to per-card transform is continuous (not stepped), so it
  tracks the cursor/scroll smoothly rather than snapping between states.
- **Desktop input source**: a `useCursorProximity` hook tracks
  `window` `mousemove`, computes distance from the viewport's bottom edge,
  and normalizes it to `0-1` (clamped) as fan progress. No page scrolling on
  desktop — the viewport is fixed.
- **Touch input source**: the page becomes scrollable, and scroll position
  (`scrollY / (scrollHeight - viewportHeight)`, or a dedicated scroll
  container) is normalized to the same `0-1` fan progress and fed into the
  identical downstream animation logic. Desktop and touch share the fan
  animation code; they differ only in what produces the `0-1` value.
- Hovering (desktop) an individual fanned card gives it a small extra
  lift/scale for click affordance.
- Clicking a card navigates via Next's router to `/work/[slug]` — a real
  route, so browser back returns to `/` and the stack should render at rest
  (fan progress `0`) on return, not mid-fan.

### `app/work/[slug]/page.tsx` — case study pages

- Looks up the case study by slug from `data/caseStudies.ts`, 404s
  (Next's built-in `notFound()`) if not found.
- Renders full-bleed with placeholder body content matching the case
  study's `blurb`/`thumbnail` for now.

## Interaction summary table

| Input | Desktop | Touch |
|---|---|---|
| Letter treatment trigger | hover a letter span | auto-cycle timer |
| Fan-out trigger | cursor Y proximity to bottom | scroll position |
| Card click | mouse click → route | tap → route |

## Error handling / edge cases

- Video fails to load/play (e.g. autoplay blocked): fall back to showing the
  static text rather than a blank frame — the crossfade only proceeds once
  the video reports it can play; if it errors, stay on static text.
- Case study slug not found: Next's `notFound()` → default 404 page.
- Rapid hover in/out across letters: crossfade transitions should interrupt
  cleanly (no queued animation backlog) — last-hovered-letter wins.
- Window resize: the hero's fixed-size word container and the stack's fan
  math should recompute from live viewport/element dimensions, not
  hardcoded pixel values.

## Testing approach

Given this is animation/interaction-heavy UI without a backend, testing
leans toward:

- Component-level tests (React Testing Library) for the data-driven pieces:
  letter-treatment config renders 6 zones, case-study list renders the
  configured entries, slug lookup 404s correctly for unknown slugs.
- Manual verification in a real browser for the animation/feel work (hover
  crossfade timing, fan-out smoothness, touch scroll behavior) — this kind
  of interaction quality isn't meaningfully captured by automated tests, and
  should be checked directly (dev server, real cursor/touch input) before
  calling any of it done.

## Explicitly out of scope for this spec

- Real letter-treatment videos (Weave-generated) — placeholders only, config
  is structured so real assets swap in without code changes.
- Real case-study content/copy — placeholders only.
- Deployment/hosting setup.
- `focals.mp4` / `jam.mp4` — unused until the user specifies which letters
  they belong to.
