# Textfolio — Handoff

Last updated: 2026-08-30

A designer portfolio built as a stack of paper. The landing page (the name
"ADRIAN") is the top sheet; case studies sit beneath it and fan out as the
cursor travels toward the bottom of the viewport. Clicking one lifts it out of
the stack and navigates to its own route.

**Status:** everything below is implemented and green — 21 suites / 196 tests,
`next build` succeeds. **Nothing is committed.** The working tree contains the
user's accumulated changes on top of `dd3a0fd`; preserve unrelated work.

**Latest handoff (2026-08-30):** the landing-page headline now cycles through
three deterministic treatments on distinct hover entries: ASCII → Warp → Stroke
→ repeat. All three render inside the same `clamp(13rem, 25vw, 20rem)` headline
frame and share the PP Frama / 900 typography baseline, so changing treatment
does not change the word's overall form factor. The frame clips transient
overflow; Warp and Stroke no longer impose competing heights.

The new Stroke Text treatment is based on the React Bits SVG/GSAP idea. Its
settings are exposed in the right-aligned compact Settings panel: stroke/fill
colors, stroke width, draw duration, fill delay, character stagger, easing,
trigger, fill mode, source font size, font weight, letter spacing, and reverse
draw. `gsap` is now a runtime dependency. Focused tests cover the tab, settings,
cycle, and shared headline frame; production build is green.

---

## Running it

```bash
npm ci
npm run dev      # http://localhost:3000
npm test         # jest
npx tsc --noEmit # typecheck (next build runs this too)
npm run build
```

Node 24 / npm 11 verified. Windows, `core.autocrlf=true` — **the working tree is
CRLF**. Write files with CRLF or every edit shows as a whole-file diff.

## Routes

| Route | What it is |
|---|---|
| `/` | The paper stack. Cursor-driven fan + emphasis sweep. |
| `/work/[slug]` | A case study: coloured header over cream body. |
| `/prototypes/focus` | Harness comparing five focus transitions. Dev tool, ships in the build. |

---

## The interaction model

One cursor position drives everything. Distance from the bottom edge normalizes
to `travel` (0–1) across `thresholdPx`, then splits into two sequential phases
at `fanSplit`:

```
fanProgress   = clamp(travel / fanSplit, 0, 1)          # the stack fans open
sweepProgress = clamp((travel - fanSplit) / (1 - fanSplit), 0, 1)   # emphasis travels down
```

Touch devices produce the same `travel` from scroll position and feed the
identical split — desktop and touch differ *only* in what produces the number.

### Bands, not recedes

Sheets are full-bleed and anchored top-left, so a sheet's visible band is the
gap between its bottom edge and the bottom edge of the sheet in front of it.
Each case study owns a **band thickness**; bottom insets are the cumulative sum
from the back:

```
bottom(N)   = 0                          # backmost sheet is the fixed base
bottom(d-1) = bottom(d) + thickness(d)
```

This is why emphasis can mean "more space" — a sheet grows its own band, and
the hero lifting to make room falls out automatically.

### The emphasis peak

A smoothstepped triangular peak glides from the first case study to the last:

```
peak      = 1 + sweepProgress * (N - 1)
weight(d) = smoothstep(1 - |d - peak| / emphasisFalloff)   # 0 for d < 1
```

Weight drives three channels: band thickness (`+ weight * emphasisBonusPercent`),
blurb opacity (ramp starting at 0.35), and brightness (lerps toward 1).

### The reveal wavefront

A second, *monotonic* wavefront travels with the peak and stages the stack so
the deeper sheets stay hidden until the cursor reaches them:

```
reveal(d) = smoothstep((peak + revealLeadSheets - d) / revealLeadSheets)
```

It multiplies both band thickness **and** tilt. Set `revealLeadSheets` to 0 to
open the whole stack at once.

### Tilt

```
rotate = clamp(tiltStepDegrees * (depth + 1) * fanProgress * reveal, ±maxTiltDegrees)
```

The hero is depth 0 and tilts like any other sheet. The backmost sheet never
tilts (see invariants).

---

## Invariants — break these and things regress visibly

These each cost a debugging round to find. There are tests pinning all of them.

1. **Tilt must never reverse.** An earlier version folded emphasis into the
   angle (`* (1 - weight)`), which rocked each sheet one way and back as the
   peak crossed it — a visible see-saw. Both `fanProgress` and `reveal` only
   grow with the gesture, which is what keeps rotation single-directional.
2. **`reveal` must stay monotonic in sweep.** A sheet that re-closes mid-gesture
   flutters.
3. **The backmost sheet is a fixed base** — never tilts, never moves, always
   `bottom: 0`. It covers the viewport squarely, which is the *only* reason no
   gap opens behind the stack. (It replaced a separate backdrop element.)
4. **Never hardcode z-indices.** They derive from `sheetCount` as
   `(sheetCount - depth + 1) * 10`. A fixed base of 40 put the 5th sheet at
   `-10`, behind the backdrop — invisible, and the old tests passed anyway.
5. **Sheets overscan 60% past both side edges** (`SHEET_OVERSCAN_PERCENT`) so a
   tilted sheet reveals the one behind it along the bottom only, never the
   sides. Sheet content must be inset back to the viewport columns —
   `sheetViewportLeftPercent()` does this, used by both the tilt pivot and
   `CaseStudyPreview`'s text.
6. **A headline effect must never distort the element that owns the hover.**
   (The two-layer split that enforced this was removed with the CSS effects;
   the current treatments hover the wrapper instead.) An effect that jitters,
   clips or rewrites the *interactive* element re-fires enter/leave against
   itself — the same failure as the next item.
7. **Nothing may key off hovering a sheet.** Focus used to be hover-driven while
   the focused geometry moved the sheet out from under the cursor →
   mouseenter/mouseleave feedback loop → strobing. JSDOM has no layout or
   hit-testing, so no unit test can catch this class of bug.
8. **`animationend` never fires under `prefers-reduced-motion`.** Anything that
   waits on it needs a timer backstop, or the interaction dead-ends. The sheet
   lift → navigate handoff does.
9. **Tests derive from `caseStudies.length`**, not hardcoded `[0,1,2,3]`. Keep
   it that way; that's how invariant 4's bug surfaced.
10. **`CaseStudyView`'s header must match `CaseStudyFocus`'s final frame** (same
   `p-12`, bottom alignment, type sizes) or the route handoff jumps.

---

## Performance

Cursor-driven animation was choppy twice. Both causes are worth knowing:

- **Input rate ≠ frame rate.** Mice report at 125–1000Hz. Every event used to
  call `setState`, re-rendering six full-viewport sheets several times per
  displayed frame. Now events write to a ref and a `requestAnimationFrame` loop
  reads it once per frame, easing with a frame-rate-independent exponential
  (`1 - e^(-dt/tau)`, `tau = FAN_SMOOTHING_MS`). The loop stops when settled and
  restarts on input. `transitionMs` defaults to **0** — a CSS transition on top
  of this retargets every frame and fights it.
- **Kinked curves read as jarring.** Triangular peaks change speed abruptly at
  the tip and edges; hence `smoothstep` everywhere.

**The next lever, if choppiness returns:** `bottom` is the only animated
property that isn't GPU-composited, so it forces layout each frame. Fixing that
means moving band geometry to `clip-path: inset()` with content positioned by
`transform` — a real refactor, worth doing only if it's actually visible.
Secondary suspect: the line-boil SVG filter on blurbs *inside* animating sheets.

---

## File map

```
lib/
  fanProgress.ts    travel from cursor/scroll, split into the two phases
                    FAN_THRESHOLD_PX 450 · FAN_SPLIT 0.45 · FAN_SMOOTHING_MS 90
  fanSheet.ts       FanSheetConfig + all sheet geometry (emphasis, reveal,
                    bands, insets, tilt). SHEET_OVERSCAN_PERCENT 60
  smoothing.ts      smoothTowards() — frame-rate independent ease
  focusVariants.ts  the five focus transitions; DEFAULT_FOCUS_VARIANT_ID "lift"
  asciiText.ts      config for the three.js ASCII headline treatment   [no tests]
  warpText.ts       config for the ogl/WebGL warp headline treatment   [no tests]
  strokeText.ts     config for the gsap stroke-draw headline treatment [no tests]
  letterEffects.ts  six CSS letter effects — SUPERSEDED, see below
  asciiText.ts      ASCII treatment defaults and exposed controls
  warpText.ts       Warp treatment defaults and exposed controls
  strokeText.ts     Stroke treatment defaults and exposed controls

hooks/
  useFanProgress.ts rAF loop + input listeners → { fanProgress, sweepProgress }
  usePointerType.ts fine vs coarse
  useActiveLetterIndex.ts  which ADRIAN letter is hovered
  useScrambledText.ts      churns characters — SUPERSEDED, see below

components/
  PaperStack.tsx        composes hero + one sheet per case study, owns z-order
  PaperSheet.tsx        one sheet: inset, tilt, shadow, 16px radius
  Hero.tsx              ADRIAN + tagline + scroll hint; rides up as stack opens.
                        The headline now routes to one of ASCIIText / StrokeText
                        / WarpText via `activeEffect`
  CaseStudyPreview.tsx  a sheet's title/blurb; optional onSelect, else router.push
  CaseStudyFocus.tsx    the lift overlay; onEntered fires when the anim finishes
  CaseStudyView.tsx     case study page body (coloured header + cream body)
  FanDebugPanel.tsx     live tuning, behind a Settings button
  LineBoil.tsx          SVG turbulence filters cycled at 6fps
  ASCIIText.tsx         headline as three.js ASCII render        [no tests]
  WarpText.tsx          headline warped in a WebGL shader (ogl)  [no tests]
  StrokeText.tsx        headline stroke-drawn with gsap          [no tests]
  ASCIIText.tsx         WebGL ASCII treatment with per-character color chips
  WarpText.tsx          OGL warp treatment with the WebGL fallback copy
  StrokeText.tsx        GSAP SVG stroke/fill treatment; configurable animation

data/
  caseStudies.ts      5 entries, Post-it colours; first two are Spotify Jam and
                      Focals by North, each with a video
  letterTreatments.ts 6 position-indexed treatments: a coded effect + bgColor
```

Every source file has a paired `.test`. The repo is TDD-built — **write the
failing test first**; the pure functions in `lib/` make almost everything
testable without a browser.

## Tuning

All live in Settings (top-right of `/`): mechanic toggle, per-case-study band
thickness, emphasis bonus, emphasis falloff, reveal lead, max tilt, brightness
falloff, fan/sweep split, smoothing, transition, threshold. Defaults are
`DEFAULT_CONFIG` in `app/page.tsx`.

Not yet sliders: `HERO_LIFT_RATIO` (PaperStack), `SHEET_OVERSCAN_PERCENT` and
tilt step (fanSheet/page), `--case-study-header-height` (globals.css, 30vh),
line-boil intensity/fps/frequency (LineBoil.tsx).

## Typography

Self-hosted via `next/font/local` from `app/fonts/`:
`PPFrama-Black.otf` → `--font-display`, `Adrian-Regular.otf` → `--font-script`.
Headline is `max(3rem, 15.97vw)` and tagline `max(1.1rem, 4.44vw)` — 230px/64px
at a 1440 frame, held proportional at any width. All hover treatments share a
single `clamp(13rem, 25vw, 20rem)` frame, `PP Frama` family, and weight 900;
Warp's canvas and Stroke's SVG scale into that frame. Tracking is default:
measured against the reference, PPFrama-Black sets ADRIAN at 4.066em vs the
reference's 4.04em, so no correction is needed.

**Line boil** (ported from `github.com/kliszaj/taliadrian`) applies to
`.font-script` globally — every use of the Adrian handwriting boils, no opt-in
class needed.

---

## Next steps

### Blocking before this goes public

1. **Nothing is committed.** ~36 files of work sitting in the working tree.
2. **Font licensing.** `PPFrama-Black.otf` and `Adrian-Regular.otf` are
   commercial Pangram Pangram files now inside the repo. Resolve before the
   repo goes public or this deploys.
3. **The debug panel ships to production.** The Settings button is visible to
   every visitor. Gate it on `process.env.NODE_ENV === "development"` (the
   reference repo gates its equivalent on `import.meta.env.DEV`).
4. **`/prototypes/focus` ships too.** Delete it or gate it once the transition
   is settled.

### Content — all copy is still placeholder

5. Blurbs read "Placeholder blurb for …". These show on the sheets *and* in each
   case study header, so they're the most visible copy on the site.
6. Case studies three–five are still "Case Study Three"… The first two are
   real: Spotify Jam and Focals by North.
7. The tagline says **"Designer, tinkerer, idea-booster"**; the Figma reference
   says **"idea guy"**. Left alone deliberately — copy was never the ask.
8. Both videos are now assigned: `jam.mp4` → Spotify Jam,
   `focals.mp4` → Focals by North. Case studies three–five have no video, which
   the type and the view both handle (`videoSrc` is optional).

### Design decisions parked

9. **`letterTreatments` still uses the old muted pastels** (`#E4C1C1`, `#C1D4E4`
   …) while the case studies moved to Post-it brights. Hovering a letter of
   ADRIAN will look washed out next to the stack. They used to share a palette
   by design; that link is now broken.
9b. **The six letter effects are placeholders**, tuned by eye and never seen
   running. Each is a handful of CSS keyframes in `globals.css` under "Letter
   treatments"; `scramble` is the only one needing JS.
10. **The 16px corner radius is invisible.** With 60% overscan every corner sits
    off-screen. Either inset the sheets into cards (corners visible, but the
    base sheet shows down both sides) or soften the diagonal bottom edge
    instead. Currently applied but doing nothing.
11. **No visible back link** on case study pages. Browser back works — that was
    the architectural requirement — but there's no on-page affordance.
12. **The neutral beat** at the fan/sweep split, where the stack is fully open
    with nothing emphasized. Intentional; `fanSplit` → 0 removes it.

### Superseded — decide whether to delete

17. **The six CSS letter effects are dead code.** `lib/letterEffects.ts`,
    `hooks/useScrambledText.ts` (zero non-test references), the
    `.letter-effect-*` blocks in `globals.css`, and the `effect` field on
    `data/letterTreatments.ts` are all unreachable — `Hero` now renders the
    headline through ASCIIText / StrokeText / WarpText instead. Their tests
    still pass, which is why the suite is green and the rot is invisible.
18. **`data/letterTreatments.ts` is nearly dead too** — only `NAME` is still
    imported from it. The per-letter `bgColor` crossfade and the six treatments
    are no longer wired to anything.

### New debt from the treatment work

19. **Three graphics libraries, none tested.** `three` (ASCIIText), `ogl`
    (WarpText) and `gsap` + ScrollTrigger (StrokeText) each arrived with a
    component and a lib config and **no test file** — 8 untested source files
    in total. Everything else in this repo is TDD-built; these are the
    exception. WebGL and canvas do not run under jsdom, so cover the *config*
    and the DOM contract rather than the render.
20. **Bundle weight.** three + ogl + gsap is a lot of JavaScript for one
    headline. ASCIIText and WarpText at least `import()` lazily; gsap is a
    static import in StrokeText. Only one treatment is active at a time — worth
    checking what actually ships.
21. **Pick one headline treatment.** Three parallel systems for the same six
    letters is a lot to carry. Once chosen, delete the other two along with
    their libs.

### Housekeeping

13. `npm run lint` reports 1 error + 2 warnings, all pre-existing, in
    `jest.config.js` and `jest.setup.ts`. `next build` doesn't run ESLint.
14. **`Hero`'s `subheaderRef` prop is dead** — added in `dd3a0fd` so the fan
    trigger could anchor to the tagline's real position instead of a fixed pixel
    threshold. Nothing passes it. Either wire it up or delete it.
15. **`framer-motion` is a dependency and completely unused.** The stack and
    focus animation is CSS + a rAF loop; the headline uses three/ogl/gsap.
    Nothing imports framer-motion. Drop it.
16. **The spec at `docs/superpowers/specs/2026-08-30-progressive-emphasis-sweep-design.md`
    has drifted.** It documents the emphasis sweep as designed, but the reveal
    wavefront, tilt cap, static base sheet, JS smoothing, and the removal of the
    backdrop element all landed after it was written. Trust this file and the
    tests over that spec.

---

## History worth knowing

The repo was cloned at `dd3a0fd`, which **did not build** — that commit widened
`FanSheetConfig` and made `CaseStudyPreview`'s `focused` prop required, but left
four call sites unupdated. Wiring up its half-finished hover-to-read focus
mechanic exposed that it could not work at all (invariant 6), and it was
replaced by the continuous emphasis sweep that the model is built on now.
