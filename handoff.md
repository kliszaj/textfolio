# Textfolio — Handoff

Last updated: 2026-08-30

A designer portfolio built as a stack of paper. The landing page (the name
"ADRIAN") is the top sheet; case studies sit beneath it and fan out as the
cursor travels toward the bottom of the viewport. Clicking one lifts it out of
the stack and navigates to its own route.

**Status:** everything below is implemented and green — 29 suites / 301 tests
(5 skipped), `npx tsc --noEmit` clean, `next build` succeeds. The current
checkout is `main`; the latest Cloudflare Workers deployment configuration is
committed.

**Latest continuation (2026-08-30):** added DOM-contract tests for
`ASCIIText`, `WarpText`, and `StrokeText` covering accessible labels, fallback
copies, readiness flags, shared typography forwarding, and configurable SVG
colors. `ASCIIText`'s props are now correctly typed as a partial config because
the component already supplies defaults for every setting.

**Bundled PP Frama (2026-08-30):** PP Frama is self-hosted through
`next/font/local` as `--font-pp-frama`. Use that variable, never the local
machine font name `"PP Frama"`, in headline CSS, SVG, and canvas code. Warp and
ASCII redraw their rasterised textures after `document.fonts.ready`, preventing
a fallback font from being captured during a deployed visitor's first paint.

**Blue-pencil sketch treatment (2026-08-30):** The opening StrokeText treatment
draws all six outlines in sequence (1.1s each, 30ms stagger) before any
shading starts. Its default fill is clipped SVG hatching whose lines draw
one-by-one with deterministic variation in spacing, angle, length, opacity,
and weight. Hatching starts from the centre after a short one-second beat,
giving the letter strokes a head start without turning the fill into a second
late phase. Its lettering,
tagline, and arrow share cobalt `#0057FF` ink;
the correction circle and X remain red and share the same GSAP timeline as
the hatching, starting only after both the final outline and final hatch line
have landed, with a small settling beat;
the full sketch sequence fits inside a 3s treatment window, so the pen never
gets cut off at handover. Settings exposes the draw range, `Pencil
pressure` easing, and `Pencil hatching` fill. For genuinely human letterforms,
use a straight, high-resolution scan/photo of the actual word as an
SVG/transparent asset; texture alone can only roughen the typed PP Frama
shape.

The sketch stage mounts the supplied `public/assets/cool-s.svg` blue
"cool S" mark in the top-left corner. It remains as a pointer-inert
sketchbook doodle after the opening story settles (and during any active
StrokeText hover), rotated 15 degrees clockwise with a short
reduced-motion-safe entrance fade.
The sketch treatment's bottom arrow uses a slightly larger responsive size than
the ASCII/Warp arrow while retaining the same viewport anchor.

**Treatment surfaces (2026-08-30):** `Hero.module.css` owns full-hero,
pointer-inert treatment surfaces rather than putting a backdrop behind the
headline frame. Stroke fades in a faint dot-grid/fibre paper field, and ASCII
fades in scanlines, a subtle RGB grille, and an inset CRT vignette. Both layers
stay below the `z-10` headline and arrow, so they cannot create a visible
headline bounding box or intercept hover input. Keep these surfaces restrained:
the glyph treatment is the focal point, not the texture.

**Paper shader background (2026-08-30):** The sketch treatment also mounts
`SketchPaperShader` through a client-only dynamic import. It uses the pinned
Apache-2.0 `@paper-design/shaders-react@0.0.80` `PaperTexture` component under
the CSS dot-grid layer. It is static (`speed={0}`), pointer-inert, capped at
1.5M pixels, and only mounted during the Stroke phase. Do not statically move
the dependency into `Hero`: the dynamic component keeps this extra WebGL
payload out of the resting/ASCII/Warp path.

**Paper Texture settings (2026-08-30):** `lib/paperTexture.ts` is the source
of truth for the shader config. The dev-only Settings panel has its own `Paper
Texture` tab, wired through `page` → `PaperStack` → `Hero` →
`SketchPaperShader`. It exposes both colours, opacity, contrast, roughness,
fibre and size, crumples and size, folds and count, speckles, fade, scale, and
seed. The current default paper is pure white with a neutral `#E3E3E3` fibre
at full opacity. `colorBack` also becomes the sketch hero's fallback/background
colour, so no seam shows around the shader canvas.

**ASCII CRT pass (2026-08-30):** `ASCIIText` applies a barrel curve and
scanline modulation in its existing Three.js fragment shader before the frame
is sampled into ASCII cells. The scanline intensity stays at `0.68`; barrel
curvature is now an independent `crtCurvature` setting with a restrained
`0.32` default (range `0`–`1`) so the A and N retain their shape. This is
browser-native code, not ShaderGlass or a port of its GPL implementation. The
page-wide CRT surface is complementary: the shader changes the characters;
the CSS layer supplies the glass/screen context.

**Mobile interaction (2026-08-30):** coarse-pointer devices mount
`MobilePortfolio`, not the fixed desktop paper stack. It is a native vertical
scroll: full hero first, then every case study as a full-width tappable sheet.
There is no cursor trigger, scroll spacer, emphasis sweep, or rotation on this
path. Fine-pointer desktop devices continue to use the original cursor-driven,
rotating stack unchanged; `useFanProgress` is disabled while mobile is active.

The Warp treatment's scripted load demo now moves its simulated pointer
left-to-right along one restrained sine cycle (`demoPointerAt` varies both x
and y), rather than following a straight horizontal line. Real pointer input
still takes over immediately when the visitor moves.

**Cloudflare repair (2026-08-30):** Cloudflare's build image uses npm 10.9.2,
which rejected the prior lockfile because optional `@emnapi/core` and
`@emnapi/runtime` entries were missing. `package-lock.json` is now regenerated
with npm 10.9.2. The exact Cloudflare sequence (`npm ci`, then `npm run build`)
passes locally; keep the lockfile committed.

The current Cloudflare integration uses Workers Builds with Workers Static
Assets. `wrangler.jsonc` declares `assets.directory: "./out"` and a
compatibility date, while `package.json` exposes `npm run deploy` as the
production deploy command. Configure Workers Builds with `npm run build`,
`npx wrangler deploy` (production), and `npx wrangler versions upload`
(non-production/version command). This prevents Wrangler from auto-configuring
the Next OpenNext adapter; the app remains a plain static export.

**Latest handoff (2026-08-30):** the headline is now a short story rather than
a static word. On load it plays four stages — **sketch → ascii → warp →
finished** — each rendered by a different treatment, with a fade at every
handover so a treatment is never seen mounting. Once the story ends, hovering
the headline cycles the same three treatments on distinct entries (ascii →
warp → stroke → repeat) and the calm Warp treatment is what the page rests on.

The site is a **static export** deployed with Cloudflare Workers Static Assets —
`output: "export"`, `generateStaticParams` per case study, build output `./out`,
no adapter and no server runtime.

---

## Running it

```bash
npm ci
npm run dev      # http://localhost:3000
npm test         # jest — 25 suites / 285 tests
npx tsc --noEmit # typecheck (next build runs this too)
npm run lint     # clean
npm run build    # static export into ./out
```

Node version is pinned in `.nvmrc` (**24.18.0**); npm 11. Windows,
`core.autocrlf=true` — **the working tree is CRLF**. Write files with CRLF or
every edit shows as a whole-file diff.

## Routes

| Route | What it is |
|---|---|
| `/` | The paper stack. Cursor-driven fan + emphasis sweep. |
| `/work/[slug]` | A case study: coloured header over cream body. One page per entry, prerendered by `generateStaticParams`. |

`/prototypes/focus` **has been deleted.** `lib/focusVariants.ts` survives it —
`CaseStudyFocus` still reads a variant from it, and `DEFAULT_FOCUS_VARIANT_ID`
("lift") is the one the real navigation uses.

## Deployment

`next build` emits a plain static site into `./out`. In Cloudflare Workers Builds,
use build command `npm run build`, production deploy command `npx wrangler deploy`,
version command `npx wrangler versions upload`, and root directory `/`.
`wrangler.jsonc` maps Worker Static Assets to `./out`. No API routes, no
middleware, no server actions, no image optimisation (`images.unoptimized`), no
environment variables. See `README.md` for the dashboard table.

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

### Three inputs, one number

On a fine pointer there are now two ways to drive `travel`, and they have to
share it:

- **The cursor is absolute.** `computeCursorTravel` maps its distance from the
  bottom edge straight onto `travel`.
- **The wheel is relative.** `travelAfterWheel` *nudges* the travel already
  held by `deltaY / FAN_WHEEL_RANGE_PX` (700px covers the whole gesture, so a
  scroll opens the stack at roughly the rate walking the cursor down would).
- Leaving the document (`mouseleave` on `<html>`) aims back at 0.

The two would fight: the wheel sets a position the cursor never agreed to, and
the next `mousemove` would snap it straight back. So a wheel event records a
**takeover anchor** at the cursor's last known point, and `mousemove` ignores
itself until it has travelled more than `FAN_POINTER_TAKEOVER_PX` (12px) from
it. See invariant 17.

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

## The headline

The word ADRIAN has **three treatments**, not the six CSS letter effects an
older version of this file described. Those effects and `useScrambledText` are
gone; only their keyframes are still lying around in `globals.css` (see debt).

| Treatment | Library | What it is |
|---|---|---|
| `StrokeText` | `gsap` + `ScrollTrigger`, plain SVG | The word drawn as an outline and shaded in. Pencil-sketch style. |
| `ASCIIText` | `three` (dynamic `import()`) | An extruded 3D word re-rendered as coloured ASCII cells, leaning toward the cursor. |
| `WarpText` | `ogl` / WebGL2 (dynamic `import()`) | The word painted to a canvas texture and pushed through a warp + refraction shader. |

All three render inside the same `clamp(13rem, 25vw, 20rem)` headline frame
(`data-testid="headline-frame"`) and share the PP Frama / weight-900 baseline
via `--headline-font-size` / `--headline-font-family` /
`--headline-font-weight`, so changing treatment never changes the word's form
factor. The frame is `overflow-hidden` and clips transient overflow.

### The intro story

`lib/headlineIntro.ts` is a pure clock; `hooks/useHeadlineIntro.ts` drives it
off one rAF loop:

```
sketch 3000ms  ->  ascii 3000ms  ->  warp 3000ms  ->  final
                                      total 24000ms + a 300ms fade-in tail
```

`introStateAt(elapsed)` returns `{ phase, opacity, done }`.
`handoverOpacityAt` dips opacity to 0 exactly on each stage boundary and eases
back out either side (`HEADLINE_HANDOVER_MS` 600), so **treatments are swapped
while nothing is on screen** — the boundary at 0 doubles as the page's own
fade-in, and the last stage still fades back in before `done` flips.

`Hero` maps `phase` to a treatment: `sketch → StrokeText`, `ascii →
ASCIIText`, `warp → WarpText`, `final → null`, and `null` falls through to
`WarpText` in its calm resting state. During the story, `ASCIIText` gets
`demoTiltMs = HEADLINE_INTRO_DEMO_MS` and `WarpText` gets `demoSweepMs =
HEADLINE_INTRO_DEMO_MS`. That duration is derived from the sketch's stage,
leaving only the outgoing fade beat; if the sketch needs longer, both demos
and every treatment stage grow with it. Both hand control to the real pointer
the instant one moves, and both are 0 once the story is over.

**Hover cycling only takes over once the story ends** (`if (!intro.done)
return` in `activateHeadline`). The cycle is ascii → warp → stroke → repeat,
indexed by a ref so it advances once per distinct pointer entry.

Reduced motion skips the whole story: `useHeadlineIntro` returns
`HEADLINE_INTRO_SETTLED` and the page opens on the finished treatment.

### StrokeText's sketch

`sketchStyle` is `"clean"` or `"pencil"` (default). A **`"blueprint"` style
existed and has been removed** — don't reintroduce it without a reason.

Pencil is built from SVG filter primitives, not a drawing library:
`feTurbulence` + `feDisplacementMap` makes the outline *wander* like a drawn
line; a second, much finer turbulence is composited into the alpha so the ink
breaks up like graphite; the fill is a rotated hatch `<pattern>` rather than
flat colour, so a filled letter reads as shaded in by hand. Four re-seeded
filter variants (`SKETCH_BOIL_SEEDS`) are cycled on the shared line-boil beat
via `useLineBoilFrame`, so the drawn line is *redrawn* a few times a second
instead of sliding around.

The sketch also shows the word **mid-correction**: the final N is drawn
mirrored about its own centre (`mirrorAboutBox`) so it reads back to front
while still occupying the right space, and red pen marks — a loop that
overshoots where it closes (`correctionLoopPath`) and an arrow with a head
(`correctionArrowPath`) — are drawn on top after the letters have finished
(`CORRECTION_INK`, `CORRECTION_DRAW_MS`). `Hero` passes `correctionIndex =
NAME.length - 1`; omit it for a clean headline.

---

## Invariants — break these and things regress visibly

These each cost a debugging round to find. There are tests pinning most of
them; the ones that only a browser can catch are marked.

1. **Tilt must never reverse.** An earlier version folded emphasis into the
   angle (`* (1 - weight)`), which rocked each sheet one way and back as the
   peak crossed it — a visible see-saw. Both `fanProgress` and `reveal` only
   grow with the gesture, which is what keeps rotation single-directional.
   Still true: `computeSheetInset` takes `fanProgress * reveal` and nothing
   else.
2. **`reveal` must stay monotonic in sweep.** A sheet that re-closes mid-gesture
   flutters. Still true: `computeReveal` is a smoothstep of a term that only
   rises with `sweepProgress`.
3. **The backmost sheet is a fixed base** — never tilts, never moves, always
   `bottom: 0`. It covers the viewport squarely, which is the *only* reason no
   gap opens behind the stack. (It replaced a separate backdrop element.) Still
   true: `isBase = depth >= sheetCount` forces `rotate` to 0, and the inset sum
   runs from `depth + 1`, so the base sums nothing.
4. **Never hardcode z-indices.** They derive from `sheetCount` as
   `(sheetCount - depth + 1) * 10`. A fixed base of 40 put the 5th sheet at
   `-10`, behind the backdrop — invisible, and the old tests passed anyway.
   Still true: `zIndexForDepth` in `PaperStack`.
5. **Sheets overscan 60% past both side edges** (`SHEET_OVERSCAN_PERCENT`) so a
   tilted sheet reveals the one behind it along the bottom only, never the
   sides. Sheet content must be inset back to the viewport columns —
   `sheetViewportLeftPercent()` does this, used by both the tilt pivot and
   `CaseStudyPreview`'s text. Still true.
6. **A headline treatment must never move the element that owns the hover.**
   The hover target is the fixed-size `headline-frame`; every treatment renders
   into an absolutely-positioned `headline-stage` filling it. Because the frame
   is `clamp(13rem, 25vw, 20rem)` tall regardless of what is inside it,
   swapping treatments cannot resize the hover target and re-fire
   enter/leave against itself. Put a treatment in the flow instead of the stage
   and you get the same feedback loop as the next item. **(No jsdom test can
   catch this.)**
7. **Nothing may key off hovering a sheet.** Focus used to be hover-driven while
   the focused geometry moved the sheet out from under the cursor →
   mouseenter/mouseleave feedback loop → strobing. Still true: `PaperSheet` and
   `CaseStudyPreview` have no hover handlers at all. JSDOM has no layout or
   hit-testing, so no unit test can catch this class of bug.
8. **`animationend` never fires under `prefers-reduced-motion`.** Anything that
   waits on it needs a timer backstop, or the interaction dead-ends. Still
   true: `CaseStudyFocus` arms a `setTimeout(variant.durationMs + 120)`
   alongside `onAnimationEnd`, guarded by `enteredRef` so whichever wins fires
   `onEntered` exactly once, and waits 0ms under reduced motion.
9. **Tests derive from `caseStudies.length`**, not hardcoded `[0,1,2,3]`. Keep
   it that way; that's how invariant 4's bug surfaced. Still true — see
   `PaperStack.test.tsx` (`LAST`, `MID`, `paper-sheet-${caseStudies.length}`).
10. **`CaseStudyView`'s header must match `CaseStudyFocus`'s final frame** or
    the route handoff jumps. Still true, and it is an exact match today: both
    are `p-12`, `flex flex-col justify-end`, `h1.font-display.text-5xl
    md:text-7xl`, `p.font-script.text-2xl.mt-4`. Change one, change both.

### From the treatment work

11. **Never let a value change rebuild a WebGL context.** Tearing down and
    recreating three's renderer or ogl's context mid-interaction is
    catastrophic — a visible black frame at best. So:
    - `WarpText`'s `color` is **deliberately absent from the effect's dep
      array**. It is mirrored into `colorRef` and pushed into the live
      `uTextColor` uniform through `contextRef.current.setTextColor`. `Hero`
      flips that colour on hover; putting `color` in the deps would rebuild the
      context on every hover.
    - `demoSweepMs` (`WarpText`) and `demoTiltMs` (`ASCIIText`) are read from
      `demoSweepRef` / `demoTiltRef` inside the rAF loop for the same reason —
      `Hero` changes them as the intro advances.
    - Everything that *is* in those dep arrays (text, font, shader params)
      genuinely needs a rebuild. Adding to them is the dangerous direction.
12. **Measurement must never feed back into what it measures.**
    - `StrokeText` measures the *untransformed* `<text>` with `getBBox()` and
      applies `inkCentringOffset` as a `translate` on the enclosing `<g>`.
      Applying the correction to the measured element would make each frame's
      measurement a function of the last one's correction, and the letters
      would walk.
    - `ASCIIText` reads its target size off the hidden fallback `<span>` (which
      carries `--headline-font-size`), not off the canvas or plane it then
      scales. `planeHeightForFontSize` deliberately cancels the text's own
      height out of the maths.
    - Both `setState` writers compare against the previous value with a 0.5px
      dead band before committing. Remove that and a ResizeObserver /
      layout-effect loop becomes an infinite render.
13. **`StrokeText`'s `viewBox` is host pixels, one user unit per CSS pixel.**
    An earlier version used an ink-hugging viewBox with `preserveAspectRatio`
    scaling it to fit, which made the rendered size a function of the
    container's aspect ratio — that is why this treatment never matched the
    other two. It also holds the group at `opacity: 0` until `hostSize` is
    measured, so the letters never flash at the placeholder scale.
14. **A treatment must never mount visible.** Mounting three.js or ogl takes
    frames, and the fallback text is on screen while it does. That is what the
    handover fade in `headlineIntro` is for, and what `ASCIIText`'s
    `data-ready` / delayed-fallback CSS is for. Swap treatments outside a
    handover window and you get a hard cut to un-styled text.
15. **Read `prefers-reduced-motion` after hydration, not during render.**
    `useHeadlineIntro` reads it inside a `requestAnimationFrame`, precisely
    because a synchronous read would disagree with the server-rendered markup
    and throw a hydration mismatch. The site is a static export, so every page
    is server-rendered — this applies everywhere.
16. **ASCIIText's chromatic split is a constant, not a function of time.**
    Driving it off `uTime` made the entire treatment shimmer. The split exists
    to give the depth ramp an edge to colour, nothing else.

### From the wheel input

17. **The cursor must not instantly reclaim the gesture from the wheel.** The
    cursor is an absolute input and the wheel is a relative one, aiming at the
    same `travel`. Without the `FAN_POINTER_TAKEOVER_PX` anchor in
    `useFanProgress`, the tiniest jog of the mouse — or the mousemove the
    browser synthesises under a scrolling wheel — snaps the stack back to
    wherever the cursor happens to be, and scrolling appears not to work at
    all. The anchor is cleared the moment the pointer genuinely moves, and on
    `mouseleave`.
18. **The wheel handler nudges `targetRef`, not `travel`.** It reads the target
    the loop is already easing toward, so a fast scroll accumulates instead of
    each event racing the eased value. Reading the rendered `travel` there
    would make the gesture's speed depend on the frame rate.

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

Third suspect, new: `ASCIIText` reads back the framebuffer with `getImageData`
every frame and redraws a full canvas of coloured cells. It is the most
expensive thing on the page by a wide margin, and it runs for 2.7s of every
page load.

---

## File map

```
lib/
  fanProgress.ts    travel from cursor/wheel/scroll, split into the two phases
                    FAN_THRESHOLD_PX 450 · FAN_SPLIT 0.45 · FAN_SMOOTHING_MS 90
                    FAN_WHEEL_RANGE_PX 700 · FAN_POINTER_TAKEOVER_PX 12
  fanSheet.ts       FanSheetConfig + all sheet geometry (emphasis, reveal,
                    bands, insets, tilt). SHEET_OVERSCAN_PERCENT 60
  smoothing.ts      smoothTowards() — frame-rate independent ease
  focusVariants.ts  the five focus transitions; DEFAULT_FOCUS_VARIANT_ID "lift"
  headlineIntro.ts  the four-stage load story: durations, boundaries, the
                    handover fade, introStateAt()
  asciiText.ts      ASCII defaults, the depth→colour ramp, plane sizing maths,
                    the extrude shading, demoTiltAt()
  warpText.ts       Warp defaults and demoPointerAt()
  strokeText.ts     Stroke defaults, SKETCH_SPECS (clean/pencil), ink centring,
                    and the correction-mark path builders

hooks/
  useFanProgress.ts    rAF loop + input listeners (mousemove, wheel, mouseleave,
                       or scroll on coarse pointers) → { fanProgress, sweepProgress }
  usePointerType.ts    fine vs coarse
  useHeadlineIntro.ts  drives the load story; reduced-motion aware
  useLineBoilFrame.ts  reads LineBoil's frame off <html> so anything can boil
                       on the same beat without a second timer
  useActiveLetterIndex.ts  which ADRIAN letter is hovered — DEAD, see debt

components/
  PaperStack.tsx        composes hero + one sheet per case study, owns z-order
  PaperSheet.tsx        one sheet: inset, tilt, shadow, 16px radius
  Hero.tsx              ADRIAN + tagline + scroll hint; rides up as stack opens.
                        Owns the intro story → treatment mapping and the hover
                        cycle
  CaseStudyPreview.tsx  a sheet's title/blurb; optional onSelect, else router.push
  CaseStudyFocus.tsx    the lift overlay; onEntered fires when the anim finishes
  CaseStudyView.tsx     case study page body (coloured header + cream body)
  FanDebugPanel.tsx     live tuning, behind a Settings button, dev-gated
  LineBoil.tsx          SVG turbulence filters cycled at 6fps
  ASCIIText.tsx         three.js → ASCII cells, coloured by depth
  WarpText.tsx          ogl/WebGL2 warp shader over a text texture
  StrokeText.tsx        gsap + SVG pencil sketch with correction marks

data/
  caseStudies.ts      5 entries, Post-it colours; first two are Spotify Jam and
                      Focals by North, each with a video
  letterTreatments.ts NAME = "ADRIAN" is the only live export; the six
                      position-indexed treatments are dead, see debt
```

Every source file now has a paired `.test`, including DOM-contract tests for the
three treatment components. The repo is TDD-built — **write the failing test
first**; the pure functions in `lib/` make almost everything testable without a
browser, while component tests pin fallback markup and readiness contracts.

## Tuning

All live in Settings (top-right of `/`, dev builds only): mechanic toggle,
per-case-study band thickness, emphasis bonus, emphasis falloff, reveal lead,
max tilt, brightness falloff, fan/sweep split, smoothing, transition,
threshold, plus a tabbed section for the three treatments' own configs
(ASCII / Warp / Stroke). Defaults are `DEFAULT_CONFIG` in `app/page.tsx` and
`DEFAULT_*_TEXT_CONFIG` in the three libs.

Not yet sliders: `HERO_LIFT_RATIO` (PaperStack), `SHEET_OVERSCAN_PERCENT` and
tilt step (fanSheet/page), `--case-study-header-height` (globals.css, 30vh),
line-boil intensity/fps/frequency (LineBoil.tsx), and every constant in
`headlineIntro.ts` (stage durations, handover length).

## Typography

Self-hosted via `next/font/local` from `app/fonts/`:
`PPFrama-Black.otf` → `--font-display`, `Adrian-Regular.otf` → `--font-script`.
Headline is `clamp(3rem, 15.97vw, 14.5rem)` — 230px at a 1440 frame, capped
because the frame stops at `72rem × 20rem` and an uncapped size outgrows it.
Tagline is `clamp(1.1rem, 4.44vw, 4rem)`, pulled back up under the letters by
`TAGLINE_OFFSET` so it sits in the same place for every treatment. All three
treatments share the frame, the `PP Frama` family and weight 900; Warp's canvas
and Stroke's SVG scale into it. Tracking is default: measured against the
reference, PPFrama-Black sets ADRIAN at 4.066em vs the reference's 4.04em, so
no correction is needed.

**Line boil** (ported from `github.com/kliszaj/taliadrian`) applies to
`.font-script` and `.boil-line` globally — every use of the Adrian handwriting
boils, no opt-in class needed, and `useLineBoilFrame` lets StrokeText's pencil
filters ride the same beat.

---

## Next steps

### Content — all copy is still placeholder

1. **Blurbs all read "Placeholder blurb for …".** These show on the sheets
   *and* in each case study header *and* in the lift overlay, so they are the
   most visible copy on the site.
2. **Case studies three, four and five are unnamed** — "Case Study Three",
   "Case Study Four", "Case Study Five", with slugs to match. The first two are
   real: Spotify Jam and Focals by North.
3. **Case study body copy is placeholder too** — `CaseStudyView` renders
   "Placeholder body copy for {title}."
4. There is a project skill at `.claude/skills/portfolio-writer/SKILL.md` for
   exactly this job: it turns raw project material into a case study built
   around decisions rather than phases. Use it rather than writing blurbs by
   hand.
5. The tagline says **"Designer, tinkerer, prototyper, idea-refiner"**; the
   Figma reference says **"idea guy"**. Left alone deliberately — copy was
   never the ask.
6. Videos: `jam.mp4` → Spotify Jam, `focals.mp4` → Focals by North. Three, four
   and five have none, which the type and the view both handle (`videoSrc` is
   optional).

### Ship-blocking-ish

7. **The debug panel is dev-gated but still in the bundle.** `SHOW_DEBUG_PANEL`
   is `process.env.NODE_ENV !== "production"`, so visitors never see the
   Settings button — but `FanDebugPanel.tsx` is 661 lines that are still
   imported statically by `app/page.tsx` and therefore still shipped. A
   `dynamic()` import behind the same flag would actually remove it.
8. **Bundle weight.** `three` + `ogl` + `gsap` is a lot of JavaScript for one
   word. ASCIIText and WarpText at least `import()` their libraries lazily;
   gsap and ScrollTrigger are static imports in StrokeText. Worth measuring
   what actually ships now that all three treatments are load-bearing (the
   intro plays every one of them, so "pick one and delete the others" is no
   longer the easy answer it was).

### Dead code to delete

9. **`hooks/useActiveLetterIndex.ts` has no non-test callers.** Left over from
   the per-letter hover model.
10. **`data/letterTreatments.ts` is nearly dead** — only `NAME` is imported.
    The six `letterTreatments` entries (positions, `bgColor`, `label`) are
    wired to nothing since the CSS letter effects were removed.
11. **The `.letter-effect-*` CSS is dead** — roughly 120 lines of keyframes in
    `globals.css` under "Letter treatments" (dither, glitch, wave, scramble,
    smear) whose JS was deleted with `lib/letterEffects.ts` and
    `hooks/useScrambledText.ts`.
12. **`app/globals.css` lines 44–210 and 212–378 are byte-identical.** The
    whole focus-transition + case-study-page block is duplicated. Harmless
    (later rules simply re-declare the same thing) but confusing, and it
    doubles the surface for any future edit — fix one copy and the other still
    disagrees.
13. **`lib/focusVariants.ts` carries five variants and only "lift" is
    reachable** now that `/prototypes/focus` is gone. Same for the four unused
    `focus-enter-*` keyframe sets. `CaseStudyFocus`'s `onClose` prop (Close
    button + Escape handler) was the harness's, and nothing passes it.

### Testing debt

14. **Treatment components only have DOM-contract coverage.**
    `ASCIIText.test.tsx`, `WarpText.test.tsx`, and `StrokeText.test.tsx` pin
    fallback text, readiness flags, aria-labels, and SVG attributes; WebGL and
    canvas rendering still need a real-browser smoke test if shader regressions
    become a concern. `app/layout.tsx` is also untested, which is fine.

### Design decisions parked

15. **The 16px corner radius is invisible.** With 60% overscan every corner
    sits off-screen. Either inset the sheets into cards (corners visible, but
    the base sheet shows down both sides) or soften the diagonal bottom edge
    instead. Currently applied but doing nothing.
16. **No visible back link** on case study pages. Browser back works — that was
    the architectural requirement — but there's no on-page affordance.
17. **The neutral beat** at the fan/sweep split, where the stack is fully open
    with nothing emphasized. Intentional; `fanSplit` → 0 removes it.
18. **The intro costs eight seconds before the page is "at rest."** Nothing is
    blocked during it — the stack fans, links work — but a returning visitor
    sits through the whole story every time. If that grates, gate it on
    `sessionStorage` rather than shortening the stages; they are tuned to the
    treatments' own animations.

### Housekeeping

19. **The spec at `docs/superpowers/specs/2026-08-30-progressive-emphasis-sweep-design.md`
    has drifted.** It documents the emphasis sweep as designed, but the reveal
    wavefront, tilt cap, static base sheet, JS smoothing, and the removal of
    the backdrop element all landed after it was written. Trust this file and
    the tests over that spec.
20. **`Hero`'s `subheaderRef` prop is dead** — added so the fan trigger could
    anchor to the tagline's real position instead of a fixed pixel threshold.
    Only a test passes it. Either wire it up or delete it.
21. `public/` still holds the create-next-app SVGs (`next.svg`, `vercel.svg`,
    `file.svg`, `globe.svg`, `window.svg`) and `README.md` still opens with the
    boilerplate intro. Only the Cloudflare section is ours.

**Resolved since the last handoff, for the record:** font licensing is settled
and is no longer an open issue. `framer-motion` has been dropped. Lint is
clean. `/prototypes/focus` is deleted. The debug panel is gated. Everything is
committed.

---

## History worth knowing

The repo was cloned at `dd3a0fd`, which **did not build** — that commit widened
`FanSheetConfig` and made `CaseStudyPreview`'s `focused` prop required, but left
four call sites unupdated. Wiring up its half-finished hover-to-read focus
mechanic exposed that it could not work at all (invariant 6), and it was
replaced by the continuous emphasis sweep that the model is built on now.

The headline went through three generations: six CSS letter effects keyed to
the letter under the cursor (deleted); three parallel treatments picked by
hover, with an open question about which one to keep (all three kept); and now
the load story, which turned "pick one" into "show all three in sequence,
because the sequence is the point" — a sketch becoming a prototype becoming
finished work. That is why the treatments are no longer interchangeable and why
deleting one is a content decision rather than a cleanup.
