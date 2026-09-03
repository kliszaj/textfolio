# Textfolio — Handoff

Last updated: 2026-09-02

A designer portfolio built as a stack of paper. The landing page (the name
"ADRIAN") is the top sheet; case studies sit beneath it and fan out as the
cursor travels toward the bottom of the viewport. Clicking one lifts it out of
the stack and navigates to its own route.

**DO NOT COMMIT OR PUSH TO GITHUB without explicit sign-off.** The case
studies now contain real content about real employers (Spotify, North,
Christie Digital) and the user has explicitly said they do not want this
published online yet. `main` on GitHub is the live Cloudflare deployment, so a
push there is a publish. This holds regardless of how clean the working tree
is or how many verification passes succeeded — a green build is not
permission to ship. Wait for an explicit "commit this" / "push this" from the
user before running `git commit` or `git push`, every time, even if a lot of
work has piled up uncommitted. See "Case study content" below for what's
currently sitting in the working tree.

**Status:** everything below is implemented and green — 37 suites / 458 passed,
`npx tsc --noEmit` clean, `npm run lint` clean. The
`react-hooks/set-state-in-effect` error at `hooks/useFanProgress.ts` is fixed:
the rest position is derived on return rather than written into state from an
effect. The current checkout is `main`, **uncommitted** — see the session log
at the bottom for what's pending, including two real, unresolved cross-browser
bugs (Brave, ASCII sizing) that need the user's own testing to close out.

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
tagline, and arrow share the sketch ink `SKETCH_INK` (`#0040C0`, exported from
`lib/strokeText.ts` — every blue in the sketch treatment is this one value);
the correction circle and X remain red and share the same GSAP timeline as
the hatching, starting only after both the final outline and final hatch line
have landed, with a small settling beat;
the full sketch sequence fits inside a 4s treatment window, so the pen never
gets cut off at handover. Settings exposes the draw range, `Pencil
pressure` easing, and `Pencil hatching` fill. For genuinely human letterforms,
use a straight, high-resolution scan/photo of the actual word as an
SVG/transparent asset; texture alone can only roughen the typed PP Frama
shape.

The sketch stage mounts the supplied `public/assets/cool-s.svg` blue
"cool S" mark in the top-left corner uses the shared `SKETCH_INK` `#0040C0`. It
is pointer-inert and only appears
while StrokeText is active; it is shown immediately without a draw-in
animation, rotated 15 degrees clockwise and offset into the visible viewport
despite the sheet overscan.
The sketch treatment's bottom arrow uses a slightly larger responsive size than
the ASCII/Warp arrow while retaining the same viewport anchor.

**Treatment surfaces (2026-08-30):** `Hero.module.css` owns full-hero,
pointer-inert treatment surfaces rather than putting a backdrop behind the
headline frame. Stroke fades in a faint dot-grid/fibre paper field, and ASCII
fades in scanlines, a subtle RGB grille, an inset CRT vignette, and a
pointer-inert Windows 95 desktop icons (`desktop` and `documents` near the
upper-right, `trash` near the lower-right) with comfortable edge padding. Both
layers stay below the `z-10` headline and arrow, so they cannot create a
visible headline bounding box or intercept hover input. Keep these surfaces restrained:
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

**ASCII CRT pass (2026-08-30):** `ASCIIText` applies a restrained 0.06 extrusion
depth, barrel curve, and
scanline modulation in its existing Three.js fragment shader before the frame
is sampled into ASCII cells. The scanline intensity stays at `0.68`; barrel
curvature is now an independent `crtCurvature` setting with a restrained
`0.32` default (range `0`–`1`) so the A and N retain their shape. This is
browser-native code, not ShaderGlass or a port of its GPL implementation. The
page-wide CRT surface is complementary: the shader changes the characters;
the CSS layer supplies the glass/screen context.

**Responsive headline sizing (2026-08-30):** The shared headline clamp now
uses both viewport width and height (`clamp(3rem, min(13vw, 18vh), 14.5rem)`),
so laptop-height viewports do not inherit oversized desktop lettering. The
headline frame follows the same rule with a smaller height floor. ASCII cells
also scale down with the measured host width through `asciiFontSizeForHost`,
with a 6px minimum, preserving the configured desktop size while adding finer
detail on phones and narrow laptop layouts.

**Latest continuation (2026-08-30):** responsive typography was verified in
the local browser at a 1280×720 viewport: the ASCII word no longer fills the
headline frame, while the tagline remains readable. The local dev server is
available at `http://localhost:3000`. Focused treatment tests and the complete
Jest suite pass; production build and TypeScript checks pass as well.

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

**Do not push to `main` without explicit sign-off** — see the callout at the
top of this file. `main` is what Cloudflare deploys, so a push is a publish,
and the case studies contain real employer content the user has said should
not go live yet.

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
- **The wheel is discrete.** Its first tick captures the desktop stack and
  each 80px wheel unit advances or retreats one of the five sheets. While
  captured, cursor movement is recorded but cannot change the reveal.
- Leaving the document (`mouseleave` on `<html>`) aims back at 0.

Clicking anywhere releases the wheel capture and immediately returns control to
the last known cursor position. This keeps the stack legible as a five-step
navigation interaction instead of letting wheel and cursor fight over it.

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
factor. The frame deliberately does **not** clip — no `overflow-hidden` — so a
treatment that draws past its own box (a correction mark, a warp, a tilted
plane) paints instead of being cut off. A test asserts the class is absent.

### The intro story

`lib/headlineIntro.ts` is a pure clock; `hooks/useHeadlineIntro.ts` drives it
off one rAF loop:

```
sketch 4000ms  ->  ascii 4000ms  ->  warp 4000ms  ->  final
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
      Do not add a sketch-only lift after centring: that puts the sketch
      headline visibly above the warp and ASCII treatments.
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

17. **The cursor must not reclaim the stack while wheel capture is active.**
    Wheel input deliberately owns the five-step home navigation until a click
    releases it. Recording pointer movement while captured makes that handoff
    land at the current cursor position rather than a stale one.
18. **The wheel handler updates `targetRef`, not rendered `travel`.** It keeps
    fast consecutive wheel ticks additive while the rAF loop applies the visual
    smoothing, so the interaction stays independent of frame rate.

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
                    FAN_WHEEL_STEP_DELTA_PX 80 · FAN_WHEEL_STEP_COUNT 5
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
Headline is `clamp(3rem, min(13vw, 18vh), 14.5rem)`, so both viewport width
and laptop/mobile height constrain the display size; the frame uses a matching
height-aware clamp. The ASCII cell grid scales down with its measured host
width and bottoms out at 6px.
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
11. ~~The `.letter-effect-*` CSS is dead.~~ **Done** — 117 orphaned lines removed.
12. ~~`app/globals.css` has a 167-line duplicated block.~~ **Done** — removed;
    the file went from 519 to 228 lines.
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
and is no longer an open issue. `framer-motion` has been dropped.
`/prototypes/focus` is deleted. The debug panel is gated. The current
responsive sizing changes are tested and build cleanly. Everything is
committed except any uncommitted work in the current checkout.

---

## Session: case study pages, page indicator, exit gesture (2026-08-30)

### Treatment transitions no longer flash a box

Two defects, both only visible on a hover swap:

1. **The fallback's 500ms delay never worked.** `data-ready="false"` is
   hardcoded in `ASCIIText`'s JSX and only flips inside the effect, i.e. after
   first paint. CSS transitions do not run on an element's *initial* style
   resolution, so `.root[data-ready="false"] .fallback { opacity: 1 }` was the
   starting value, not a transition target — the plain headline painted at full
   opacity on frame one of every mount. Fixed with a delayed
   `animation … both`, which *does* apply on initial render and holds the
   from-state through the delay. `WarpText` carried identical dead code.
2. **Nothing faded a newly-mounted treatment in.** The intro hides its swaps
   behind `handoverOpacityAt`; hover swaps were instant.

`Hero` now wraps the treatment in a keyed `.treatmentMount` with a 220ms fade.
**The key is the component identity, not `activeEffect`** — rest and `"warp"`
both render `WarpText`, so that swap must not remount. That is why
default→warp was always clean and everything else was not.

### Cool-s had a baked-in drop shadow

`public/assets/cool-s.svg` was a Figma export carrying `filter0_d_328_487`
(`feOffset dy="4"` + `feGaussianBlur` + black 25%). Stripped. Note you cannot
fix this class of thing with `filter: none` — `.boil-line` *is* a CSS filter,
and killing it kills the line boil. `public/assets/doodles.svg` (bottom-right,
recoloured to `SKETCH_INK`) was clean already.

### Page indicator

`components/PageIndicator.tsx` — left rail of five dots in the sheet colours,
hover/focus opens a bold title chip, click hands the study to `liftCaseStudy`.
Because it sits inside `page.tsx`'s `onClickCapture` wrapper, the sheet lift
originates from the dot you clicked.

**It renders inside a sheet that starts at `left: -60%`.** An inset measured
from the hero's own edge is 60vw off-screen. It uses
`calc(${SHEET_OVERSCAN_PERCENT}vw + …)`, derived from the constant rather than
the literal `60vw` `.coolS` hardcodes. A test asserts the offset accounts for
the overscan — this bug shipped once already.

### Case study pages

`CaseStudyView` is now: sticky header (home icon, title, next control) over a
two-column body (overview rail / long read) over a full-width tiled gallery.

- **Next control** wears the *next* project's colour and opens from a circle
  into a pill naming it. `getNextCaseStudy` wraps past the last study.
  The label is only visually collapsed (`max-width: 0`), never `aria-hidden`,
  or the link announces as "Next project:" with no destination.
- **Header shrink.** The entry animation (`100vh → 22vh`) uses
  `fill-mode: both`, which **pins `height` and beats any declarative rule**, so
  the scroll shrink could never fire. The header flips to `data-settled` after
  620ms and drops to plain transitioned CSS.
- **Gallery** spans are authored per item (`full` 2×2, `tall` 1×2, `half` 1×1,
  default `half`). `src` is optional: a tile with no asset holds its cell as a
  grey block rather than rendering a broken image.
- **Wide screens** get less padding and wider containers (`100rem` columns,
  `110rem` media) while prose stays at `max-w-[70ch]`.

### Home exit and the collapse home

Case studies now leave only through the explicit home button. The old upward
pull gesture and its progress bar were removed because they collided with
normal reading scroll and had no discoverable keyboard equivalent.

Arriving home, `useStackCollapse` starts the stack fanned and folds it shut,
run through the same `splitTravel` as a real gesture so the collapse is the
reveal played backwards. It returns `null` (not `0`) when done, so a reader
whose cursor is already low does not get the stack pinned shut under them.

**The effect must key off state, not the module flag.** Consuming
`returningHome` inside the effect meant React's development remount (mount →
cleanup → mount) took the early return on the second pass, never rescheduled
the frame, and left the stack frozen wide open — the animation simply never
ran. The decision is taken during render into `playing` state; the effect
clears the flag and keys off `playing`, so a remount restarts cleanly. Covered
by a test that wraps the hook in `StrictMode`.

### Intro plays once per page load

`hooks/useIntroOnce.ts` — a module-scope flag read through
`useSyncExternalStore`. Home from a case study is a client-side navigation and
would otherwise replay the whole story; a hard refresh is a new bundle and
earns the intro again.

**The server snapshot must stay `false`.** Claiming the flag during an ordinary
render consumed it *at prerender time*: the built HTML shipped the resting hero
while the client, with a fresh module, hydrated straight into the intro's
stroke phase — a hydration mismatch on every first visit (cream `#F5EDE6`
server vs white `#FFFFFF` client). `useSyncExternalStore` rather than an
effect + `setState`, because the latter trips
`react-hooks/set-state-in-effect`. Covered by a `renderToString` test.

### Typography

PP Neue Montreal (`app/fonts/PPNeueMontreal-Book.otf`) is self-hosted as
`--font-pp-neue-montreal` → `--font-body`. Case study blurbs and body copy use
`font-body`. Note the line-boil filter is keyed to `.font-script`, so switching
a element to `font-body` also takes it out of the boil — intended for a grotesk.

### Watch out for

- **Anchor every edit before writing.** A patch that silently matched nothing
  once shipped as "done" and was caught only by the user looking at the page.
- **jsdom rAF mocks that re-arm inside the callback spin forever** and OOM V8.
  Drive frames by hand instead (`hooks/useStackCollapse.test.ts` shows the
  shape).
- **Module-scope flags read during render break static export.** The prerender
  runs the same module, so anything consumed during render is consumed at build
  time. Read them through `useSyncExternalStore` with a `false` server
  snapshot, or in an effect.
- **A green suite is not proof.** Both of the above shipped past 382 passing
  tests. When adding a regression test after a fix, reintroduce the bug and
  watch the test fail before trusting it.
- The working tree is CRLF (`core.autocrlf=true`). Writes must preserve it.

## Later work: mobile sizing, the correction mark, and the sticky header

### ASCII was not scaling with the headline on small screens

`planeHeightForFontSize` returns `ASCII_FALLBACK_PLANE_HEIGHT` (13 **world
units**) whenever the headline's font size cannot be measured — a value that
ignores the viewport entirely. On a 378px-wide phone that renders about 504px
and runs off both edges; on desktop it happens to land near the right size,
which is why it only ever showed on mobile. Fonts and layout settle later on a
phone, so `applyPlaneScale` kept hitting that path.

It now **bails and keeps the last good scale** rather than applying the fixed
fallback, the plane is clamped to `ASCII_MAX_WIDTH_SHARE` of the frame (which
does not clip, so an oversized plane simply spills), and `fonts.ready` re-runs
the whole `resize()` because the face landing changes the word's width.

### The sketch's hatching and correction sat where the letters used to be

Two measurement guards compared the wrong things: the text box checked `x`,
`y`, `width` but **not `height`**, and the mark box only `x` and `width`. A web
font landing after the fallback changes the height, so those updates were
discarded and the hatch clip and correction were drawn to the *fallback's*
metrics. Now `boxMoved` in `lib/strokeText.ts` compares all four edges.

`document.fonts.ready` is **not** sufficient on its own — it only covers
requests made before it was read, so a late face lands after it resolves. There
is a `loadingdone` listener plus a bounded re-measure over the first ~36
frames; `boxMoved` discards anything unchanged, so it is free.

### The correction is an X, then a written N

The circle is gone, along with `WOBBLE` / `LOOP_WOBBLE_MAX` and
`CORRECTION_CROSS_LEAD_MS` (which only meant "start the X before the loop
closes"). `CORRECTION_LETTER_PATH` is a traced single open stroke, so it draws
in with the same `pathLength={1}` dash trick. It is drawn under a `scale()`
transform and therefore carries **its own** `strokeWidth`, divided back out, or
the scale would multiply the pen.

**A round cap on a fully offset dash still paints.** The pen tip showed as a red
dot on the page for the whole sketch before the N drew. Every mark now starts
at `opacity: 0` and is revealed by a `timeline.set` at the instant it starts.

### Every intro stage is three seconds

Shrinking the window was not enough: `correctionSequenceMs` ran to exactly
3000ms, so the stage would have handed over with the pen still moving. There is
an invariant test for that, and it caught it. The drawing compressed with the
window — outline draw, stagger, `fillDelay` (at 1s it would have started *after*
the outlines finished, losing the head start it exists to give them), and the
correction beats.

### The sticky header fluttered

The header's height is in the page flow, so every shrink moves the content
under the reader; the browser reports that as a scroll, which crosses the
threshold the other way, which resizes again. `lib/stickyHeader.ts` uses a
commit threshold and settle window: it can shrink after a real downward scroll,
then remains compact throughout mid-article upward reading. The full header
only returns at the top, so its large in-flow height can no longer land over the
reader's copy.

### Hover belongs to the letters, not the frame

The frame is page-wide so it can size the treatments, so hovering the empty
space either side used to change treatment. It cannot be solved by shrinking
the frame, nor by overlaying a hit target — that would swallow the
`pointermove` ASCII needs for its tilt. Instead the frame carries an invisible
copy of the word at the headline font, and `lib/headlineHit.ts` hit-tests
against its measured box. Padding is a share of the word's *height*, so it
scales with the headline. An unmeasured word returns `true`: a dead headline is
worse than an eager one.

### The white box was `isolation: isolate`

Measured off a screenshot: the flashing rectangle was 1154px wide in a 1389px
viewport, which is exactly `72rem` -- the headline frame's `w-[min(94vw,72rem)]`.
Not something painting *inside* the frame; the frame itself.

`isolation: isolate` makes the browser build a render surface the size of the
element, and a **fresh surface paints white before it has been rasterised**.
Three of them existed and none was needed:

- `headline-frame` -- unexplained; the comment beside it is about clipping.
- `WarpText .root` -- and warp is the *resting* treatment, so its surface was
  the one torn down every time another treatment mounted.
- `Hero.module.css .treatmentMount` -- not isolation, but an opacity animation,
  which promotes the same frame-sized layer with the same failure mode. It had
  been added to *hide* this flash, and was quietly causing a second one.

All three are gone. **Do not reintroduce `isolate`, `mix-blend-mode`,
`will-change`, `opacity` animation, or a transform on the frame or on any
treatment root** without checking for this. The only surviving isolation is
`ASCIIText .root[data-glyph-colors="gradient"]`, which contains the gradient
pre's difference blend and is inert in the default colour mode.

Why warp always looked clean: it never remounts, so its surface was never
re-created -- not because warp was doing anything differently.

### Watch out for

- **jsdom cannot parse arithmetic inside `clamp()`** — browsers can. Assert on
  the exported constant, not on `element.style`.
- **jsdom has no `getBBox`**, so correction marks never render in tests and
  assertions about them pass vacuously. Stub it (see `StrokeText.test.tsx`).
- The PowerShell here-string form `@'...'@` is a parse error in the Bash tool;
  use a heredoc.

## Session: real case study content, then a large checklist worked on in parallel (2026-08-31 → 2026-09-01)

**Do not push. See the callout at the top of this file.** The case studies
below contain real content about real employers; the user has explicitly said
not to publish this yet.

**Important: this repo was being edited by more than one agent session at
once during this window.** Partway through, a large batch of file changes
showed up on disk that this session had not made — `git status` and the
"changed on disk" notes are the way to notice this happening again. Do not
assume you have the full picture of the working tree from your own edit
history alone; check the actual files before reasoning about what state
something is in, and re-check after any gap in the conversation.

### The 7-item checklist — status as actually verified on disk, not as planned

The user handed over seven items in one message. Some were built by this
session, most turned out to already be done by the parallel one by the time it
was checked:

- [x] Default arrow black instead of grey — `arrowColor` in `Hero.tsx` now
  reads `activeEffect === null ? DEFAULT_INK_COLOR : accentColor`.
- [ ] **Sketch treatment: "ADRIAN" sitting higher than the rest of the
  text — status unconfirmed.** Not verified either way this session.
- [x] Sticky header jank — `lib/stickyHeader.ts` was rewritten from a
  hysteresis/settle-window state machine to a single exact rule:
  `nextHeaderShrunk(currentY) => currentY > 0`. Full header only at the exact
  document top; compact bar everywhere else. Simpler than the fix this
  session was about to attempt, and removes the class of bug entirely rather
  than tuning around it.
- [x] Pull-to-exit removed from case study pages — `lib/scrollExit.ts` and
  `hooks/useScrollUpExit.ts` are deleted outright (not just unused), along
  with the pull-progress bar UI. `leave()` in `CaseStudyView.tsx` is now a
  plain click handler.
- [x] Home-page wheel-capture interaction — implemented in
  `hooks/useFanProgress.ts` (`wheelCapturedRef`, `wheelStepRef`,
  `wheelDeltaRef`, `FAN_WHEEL_STEP_COUNT`). Not verified in a live browser by
  this session, but present, typed, and covered by
  `hooks/useFanProgress.test.ts`.
- [x] Bold next-project label on hover — `case-study-next-label` now carries
  `font-bold` in `CaseStudyView.tsx`.
- [~] Mobile bugs — **two different fixes, two different fates:**
  - The sketch correction (X spanning the whole word, red N centred on the
    header instead of the glyph) was root-caused to `measureMark()` calling
    `getBBox()` on an unpositioned `<tspan>`, a known WebKit quirk area where
    the parent `<text>`'s box can be reported instead of the glyph's. Fixed
    by preferring `getExtentOfChar(index)`, which measures one character
    directly. **This fix is still in `components/StrokeText.tsx` and
    survived the parallel session's edits untouched.** Still not verified on
    a real device.
  - The ASCII "huge and out of position on iOS" bug was given a defensive
    fix — extra `visualViewport`/`orientationchange` listeners plus a 500ms
    delayed re-measure. **This one caused a real regression on desktop**
    (reported directly by the user: the ASCII headline rendered smaller and
    offset left on reload) and was reverted in full. **Update (2026-09-02):**
    the "smaller and offset left" symptom was a real, separate, long-standing
    bug — not caused by the reverted fix, and not fixed by reverting it. See
    "The ASCII camera was closer to the plane than the plane was wide" below
    for the actual root cause and fix. The original iOS-specific report is
    still unconfirmed either way.

### The collapsible long-read and the "catchy hook" styling (parallel session)

Not asked for in the 7-item list, but built in the same window, presumably in
response to earlier requests in the conversation:

- `CaseStudyView.tsx` now collapses sections beyond the first when there are
  more than `COLLAPSIBLE_SECTION_MINIMUM` (2) of them, with a "Read more" /
  "Show less" toggle (`data-testid="case-study-read-more"`,
  `aria-expanded`).
- A new `case-study-intro` block renders `caseStudy.blurb` as a large
  `<h2>` above the sections, with `overview` as a subtitle underneath — this
  looks like the "make the hook bigger and bolder" request, formalised.
- `CaseStudySection` gained an optional `bullets?: string[]` field, and
  section `heading`s are rendered again (`<h2 className="font-bold">`) —
  reversing the earlier "no headings in the right column" decision. Given the
  new format is genuinely six short bulleted beats rather than two long
  paragraphs, headings likely earn their place back; worth confirming this
  was deliberate rather than a side effect.
- `CaseStudyFact.value` can now be a `string[]`, rendered as a `<ul>` inside
  the fact's `<dd>` — a real capability upgrade the original type didn't have.
- `components/HomeIconAnimation.tsx` — a genuinely custom five-frame
  stop-motion SVG icon (`public/assets/home-animation-1..5.svg`) that steps
  forward as the header collapses and back as it expands, with a distinct
  hover "wiggle" replay and a deliberate delay so the reverse animation
  doesn't play underneath the still-collapsed header. Replaces this session's
  much simpler raw `<img>` + `boil-line` attempt entirely.
- `components/LazyVideo.tsx` — `IntersectionObserver`-gated video loading
  (`rootMargin: "320px 0px"`), so a long case study's showreel doesn't start
  downloading while the reader is still in the opening copy. Both media types
  in `public/assets/christie-*` were also converted from `.jpg`/`.gif` to
  `.webp`/`.mp4` — smaller and more efficient than what this session copied
  in originally.
- The Windows 95/XP icon set (`public/icons/win95-winxp/`, dozens of files)
  was deleted, and a new `lightning.svg` (`data-testid="lightning"`, with
  `boil-line`) appears in `Hero.tsx` where the ASCII desktop icons used to be
  rendered. Not investigated further this session — check `Hero.tsx` and
  `Hero.module.css` for the current ASCII-stage iconography before assuming
  the old desktop-icons behaviour still applies.
- Three more weights of PP Neue Montreal were added
  (`app/fonts/PPNeueMontreal-{Bold,Medium,Regular}.otf`), alongside the
  existing Book weight.

### Case study content

- **Spotify Jam** — drafted with `portfolio-writer`, then the user rewrote it
  by hand into a punchier six-section style (no em dashes, bulleted beats
  under each bolded topic). The live copy in `data/caseStudies.ts` is folded
  in from `docs/case-studies/spotify-jam.md`, which is the user's editing
  surface going forward — check that file before assuming the data file is
  current.
- **Seamless Strategy** — drafted, then the four biggest gaps a
  `/portfolio-review` pass found (no wrong assumption, no rejected direction,
  no cost-of-alignment, no adoption number) were closed with material the
  user had another agent pull from the real internal docs.
- **Focals by North** and **Christie Digital** — built from raw material in
  `Desktop/North` (Kona) and the user's old personal portfolio site
  (`Desktop/Portfolio Website`), since `Desktop/Christie` turned out to be
  empty. `portfolio-review` findings led to real fixes (added a milestone fact
  where the entry had zero numbers, matched the "0→1" language every other
  entry's Scope fact already used).
- A new skill, `.claude/skills/portfolio-review/SKILL.md`, audits case studies
  against a staff/principal hiring bar (positioning, story structure, scope,
  hidden mess, selectivity, craft evidence). Companion to `portfolio-writer`.
- `docs/case-studies/*.md` — one file per case study, meant for the user to
  hand-edit. Fold changes back into `data/caseStudies.ts` on request; don't
  assume the two are in sync without checking.

**Real media assets were added, then reverted, then two specific ones were
restored individually** (the Focals hero video, `/assets/focals.mp4` — note
this is the *original* placeholder video, not `focals-homescreen-modules.mp4`,
which was copied in from Kona and then explicitly rejected). If asked to "add
real images" again: verify each asset by opening it before assigning a
caption — two real mismatches were caught this way (a file named
`fusion_playlist_editor.png` was actually the nav spec; an "alexa" folder
dated 2017 was an unrelated living-room concept, not Focals). Never invent a
caption for a slot with no verified real asset — grey placeholder is better
than a confident, wrong one.

### Earlier fixes this session, still standing

- **Header/column alignment at wide viewports.** Two rounds: the first fix
  matched class *names* between the header and the columns but not
  *structure* — padding ended up applied twice (once inside the header's own
  max-width box, once via the parent that already provided it for the
  columns), so the header still drifted right at wide viewports. Fixed by
  moving the header's padding to its outer element, matching exactly how
  `case-study-body` → `case-study-columns` already works. Lesson: matching
  class *strings* is not the same as matching *box structure*.
- **Second column stretches to the header's right edge.** It had a
  `max-w-[70ch]` readability cap that stopped it short of the grid track's
  true width. Removed, per the user's request — the rail column (`22rem`)
  was explicitly left alone.
- **The sketch correction's `getExtentOfChar` fix** — see the checklist above,
  still in place and still unverified on a real device.
- **About Me** — a real 5th sheet (not a case study), reusing `CaseStudyView`
  with a `CaseStudy`-shaped object in `data/about.ts` kept outside the
  `caseStudies` array. `caseStudyRoute()` in `data/caseStudies.ts` is the one
  place that knows `/about` differs from `/work/[slug]`. The "next project"
  loop runs through it too: last case study → About → first case study,
  wired as an explicit override in `app/work/[slug]/page.tsx` and
  `app/about/page.tsx`, not by adding About to the shared array (that would
  also make it a duplicate `/work/about` static route via
  `generateStaticParams`). **Correction made mid-session:** About was
  initially left out of the page indicator and the next-project loop
  entirely — the user had to point out both omissions. Don't infer scope
  narrower than asked; "make it an About page instead of a case study" did
  not mean "remove it from the places a case study normally appears."

**Superseded, not accomplished:** this session's earlier attempt at hardening
ASCII's mobile plane scaling (`visualViewport`/`orientationchange` listeners
plus a delayed re-measure) was reverted after it caused a real desktop
regression — see the checklist above. Do not re-add it without a way to
verify the fix actually helps before landing it.

### Checklist completed locally (2026-08-31) — the parallel session's own log

- [x] Default treatment arrow now rests in the ink colour; treatment arrows
      retain their individual accents.
- [x] Sketch headline alignment: removed its extra 12px post-centring lift,
      so the measured ink now shares the other treatments' centre line.
- [x] Sketch treatment's lower-right doodle is now the user-supplied
      `public/assets/lightning.svg`, retaining the existing responsive
      bottom-right placement and scale and sharing the cool S's `#0040C0`
      sketch ink.
- [x] Case-study home icon now sits above the title row instead of overlapping
      it, and maps its black SVG ink to the title's `#1C1C1C` colour while
      retaining the line-boil treatment.
- [x] The header home icon now uses the supplied five-frame SVG sequence in
      `public/assets/home-animation-1.svg` through `home-animation-5.svg`.
      It plays forward as the header collapses and backwards when the full
      header returns. Collapse hides with the compact header; rebuild waits
      180ms for the expanding header to clear the icon, and reduced-motion
      visitors receive the final frame directly.
- [x] The on-page work overviews now use Spotify Jam's concise, first-person
      structure: a short setup, named beats, and supporting bullets. They are
      designed as an invitation to an interview, not a full case-study report.
- [x] Revealed home-stack cards use larger title and subheader type, plus more
      left and bottom padding so the enlarged copy has room to sit inside each
      sheet instead of hugging the fan edges.
- [x] Sticky header stays compact at every nonzero scroll position and expands
      only at the exact document top, so body copy never sits behind it.
- [x] Removed the pull-to-exit gesture, helper modules, tests, and progress UI.
- [x] Desktop wheel input captures the five-sheet home stack in discrete steps;
      a click or moving onto a revealed card hands control back to the cursor.
- [x] The revealed next-project label is bold.
- [x] Long reads show their first two sections with a `Read more` toggle before
      the gallery; short case studies remain fully visible.

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

## Session: cross-browser treatment bugs — ASCII sizing and two Firefox draw-ins (2026-09-02)

**Do not push. See the callout at the top of this file.**

This session chased three separate, real bugs across the ASCII and sketch
treatments, reported by the user directly comparing browsers/devices rather
than from code reading alone. One early fix attempt was wrong and fully
reverted; the other three are landed, tested, and (as far as they can be
without a real Brave/Firefox session) verified.

### The ASCII camera was closer to the plane than the plane was wide

**This is almost certainly the real fix for the long-running "ASCII looks
smaller and shifted left" reports**, on desktop, that survived several earlier
attempts this project (see the checklist entry above).

Root cause, found by working the perspective maths by hand rather than by
guessing: `ASCII_CAMERA_DISTANCE` was `30`, but the plane's own half-width
works out to roughly `32` — **the plane is wider than the camera is far from
it.** `mesh.rotation.y` tilts the plane on every hover (and the intro's own
demo sweep leaves it tilted for the back half of its stage — see below), and
rotating a plane that size that close to the camera is severe keystoning in
disguise: one edge moves closer, the other farther, by `halfWidth × sin(angle)`.
At the tilt's own designed maximum (~8.6°) that puts one edge at depth ≈25 and
the other ≈35 — a ~38% difference in how large each edge projects. Blurred
through the coarse ASCII-character sampling, that reads as "the whole word got
smaller and drifted," not "it leaned." An orthographic `cos(angle)` estimate
badly understates this effect when the camera sits this close relative to the
plane — that understatement is why this was dismissed as too small to matter
earlier in the same conversation, before the maths were redone properly.

Fixed in `lib/asciiText.ts`: `ASCII_CAMERA_DISTANCE` is now 10× farther away,
and `ASCII_CAMERA_FOV_DEG` is solved backward from the old 45°/30-unit pair so
`visibleWorldHeight()` — the value every plane-sizing formula in the file is
built on — comes out identical to six decimal places (there's a test pinning
this). Only the camera's sensitivity to rotation changes; the untitled/resting
size is provably unaffected.

**A reverted, wrong intermediate step, for the record:** before finding this,
a `textTextureLayout()` fix was landed to make the extrusion's canvas margins
symmetric (the extruded body only trails down-and-right, so the old flat
margin biased the face a few px left/up within its own texture). That fix is
real and still in — `lib/asciiText.ts`'s `textTextureLayout()` — but it was
never the dominant cause; the effect is under 5px on a ~650px word. Don't
mistake it for the fix if this regresses again; check the camera-distance
maths first.

**Playwright testing at this exact bug produced a false negative** — worth
remembering. Every automated check dispatched a synthetic hover at the
headline's *centre*, which drives `pointer.targetX` to ~0 — level, no tilt,
no keystoning. That's why repeated Playwright measurements found ASCII and
Warp within 2–5% of each other and reported no bug, while the user, whose real
cursor is essentially never exactly centred, saw it every time. The bug only
surfaced once the user sent same-window, before/after screenshots directly.
**Lesson:** a synthetic interaction test that always drives a value to its
"resting" state can hide a bug that depends on that value being anything else
— don't trust it as proof of parity for anything cursor-position-dependent.

### Two unrelated Firefox draw-in bugs, both in `StrokeText.tsx`

Both reported directly by the user testing in real Firefox; neither shows up
in jsdom, and neither was something this session could verify itself once the
user asked to stop using Playwright.

1. **The correction mark's X and hand-written N "popped in" instead of
   drawing.** They used an SVG `pathLength={1}` trick (dasharray/dashoffset of
   1 = "0% to 100% drawn", author-normalised) so the GSAP tween wouldn't need
   each path's real length. GSAP writes `strokeDashoffset` as an inline style,
   and **Firefox does not rescale a style-set stroke-dasharray/-dashoffset
   against `pathLength`** — it renders in the path's real units instead. A
   dasharray/dashoffset of `1` against a path dozens of units long is
   imperceptible, so the mark was always ~100% drawn; only its `opacity: 0 →
   1` set was actually doing anything, hence "pops in."

   Fixed by measuring each mark's real length with `getTotalLength()` (an old,
   universally-supported SVGGeometryElement method, unrelated to the newer
   `pathLength` attribute's rendering-normalisation semantics) instead of
   relying on `pathLength` at all. `realPathLength()` in `StrokeText.tsx`, with
   a `1000`-unit fallback (`UNMEASURED_DASH_LENGTH`) for jsdom and any engine
   without the method. `pathLength={1}` is removed from all three affected
   elements (hatch lines, correction cross, correction letter) — leaving it in
   would have been misleading since it's no longer load-bearing. A regression
   test (`components/StrokeText.test.tsx`, "dashes each mark to its own
   measured length") mocks `getTotalLength()` and was confirmed to fail against
   the pre-fix component before the fix was written.

2. **The whole headline's outline (and, dominated by the same visual cue, its
   fill) also popped in — a different, bigger version of the same class of
   bug.** The main letters are `<tspan>`s inside a `<text>`, not `<path>`
   elements, and stroke-dasharray/-dashoffset revealing a *stroked text
   glyph's outline* progressively is not reliably supported across engines the
   way it is for a plain path or line — this is a real, separate gap from the
   `pathLength` issue above, not fixed by it.

   Rather than rebuild the per-letter staggered dash-draw into something
   text-safe (a much bigger change, and the per-letter stagger still works
   fine on engines where dasharray-on-text *is* respected), this session added
   an independent, purely additive fallback: a second clip-path
   (`outlineWipeId` / `outlineWipeRectRef`) wraps the stroke layer and sweeps
   open left-to-right over `outlineEnd` seconds, in parallel with the existing
   per-character dash animation. A clip-path only ever crops already-rendered
   output, so it reveals the word regardless of whether the dash animation
   underneath it is doing anything — correct on every engine, and redundant
   but harmless where the finer per-letter draw already works. Applied to both
   `data-stroke-layer` and the mirrored `data-correction-stroke` glyph.
   Three new tests in `components/StrokeText.test.tsx` ("the outline reveals
   itself independently of stroke-dasharray") pin the clip starting closed,
   opening to the word's full (padded) width, and being wired to the stroke
   layer's `clip-path`.

   **Not yet separately confirmed:** whether the pencil-hatch fill (fix #1,
   above) was already invisible-but-correct in Firefox once its own
   `pathLength` bug was fixed, or whether "fill also pops in" was purely the
   outline dominating what's visible. No further fill-specific change was made
   beyond fix #1 — if hatch shading is *still* reported as popping in after
   this, that needs fresh investigation, not an assumption that fix #1 covers
   it.

### Brave's ASCII bug — parked, fingerprinting protection ruled out

The user has "Block fingerprinting" enabled in Brave; ASCII is still broken
there after the camera-distance fix above resolved it everywhere else tested.
**Toggling Shields off for `localhost:3000` and reloading made no
difference** — this rules out Brave's farbling/fingerprinting protection as
the cause (that was the leading hypothesis; it's wrong). No other Brave-only
mechanism has been identified. **Explicitly parked by the user** — do not
keep investigating this unprompted. A console diagnostic script (measures
`devicePixelRatio`, the frame/word-metrics rects, and scans both the ASCII
output canvas and the Warp canvas for their real rendered ink bounding boxes)
was handed to the user to run in Brave's own DevTools when they want to pick
this back up; no results from it were received before the topic was parked.
Whoever resumes this should ask for that data first rather than re-guessing
from scratch — Shields-off already rules out one whole category of
explanation.

### The outline-wipe Firefox fix (above) briefly broke the letter stagger everywhere

Landing the clip-path fallback for Firefox's stroke-dasharray-on-text gap
(previous session entry) had a real side effect the user caught immediately:
**on every engine where the per-character dash animation already worked
correctly, running the clip-path sweep in parallel with it fought the
stagger.** The clip reveals the whole word in one continuous left-to-right
sweep regardless of how far any individual letter's own stroke has drawn — so
a letter (the last one, i.e. the correction "N", most noticeably) could be
clip-revealed at a point where its own dash-draw was already at or near
completion, and it read as arriving with the rest of the word instead of
visibly drawing in sequence. **"Fixes Firefox" is not the same bar as "doesn't
regress everyone else"** — a fallback that runs unconditionally next to a
mechanism that already works somewhere is still a regression there.

Fixed by scoping the clip-path fallback to Firefox specifically
(`isFirefox` state in `StrokeText.tsx`, read from `navigator.userAgent` inside
a `useEffect` — after mount, not during render, the same reason
`prefers-reduced-motion` is read that way elsewhere in this file — so server
and client agree on the first paint and every other engine's JSX is
byte-for-byte what it was before the Firefox fix existed). User-agent sniffing
is a deliberate, narrow exception to feature-detection-over-sniffing: this is
a documented *rendering* difference for a specific engine, not something
`@supports` or a capability check can express. A regression test
("leaves the per-character stagger alone on every other engine") asserts no
clip-path is present at all on a non-Firefox UA; the existing Firefox-path
tests now mock `navigator.userAgent` to exercise the gated branch.

### Watch out for, this session

- **A camera positioned closer than the geometry it renders is wider is a
  latent keystoning bug**, even if the untitled/resting state looks perfectly
  correct. Check this specifically any time a 3D-perspective treatment "looks
  fine at rest but wrong under interaction."
- **`stroke-dasharray`/`-dashoffset` reveal animations are not equally
  reliable across engines for every element type.** Plain `<path>`/`<line>`
  geometry: fine, but verify `pathLength`-based normalisation isn't silently
  assumed (Firefox doesn't rescale a style-set dasharray against it). Stroked
  SVG *text*: don't rely on dasharray revealing it at all cross-browser — use
  a clip-path sweep instead, or verify first.
- **A synthetic test that always drives an input to a "neutral" value (cursor
  dead-centre, no tilt) can produce a false negative for any bug that only
  shows up away from that value.** Vary the input, or get a real screenshot,
  before trusting an automated parity check.
- **A cross-browser fallback that runs unconditionally is a regression risk on
  every engine where the original already worked.** Scope it to the specific
  engine that needs it (see `isFirefox` in `StrokeText.tsx`) rather than
  running both mechanisms everywhere "to be safe."
- The user has asked this session to stop using Playwright directly; further
  browser verification here depends on the user's own testing and
  screenshots, not on this session driving a browser itself.
- `public/icons/win95-winxp/*` showed up **staged for deletion** in `git
  status` this session, unrelated to anything done here — pre-existing,
  uncommitted state, presumably from the icon-set swap logged above. Left
  untouched; flagging it here so it isn't mistaken for a new, unexplained
  change later.

## Session: page-indicator interactions and a case-study page punch list (2026-09-02)

**Do not push. See the callout at the top of this file.**

### PageIndicator: wider hover target, hover-synced dot scale, clickable chip

`components/PageIndicator.tsx`:
- `HOVER_TARGET_RIGHT_EXTENSION` raised 48 → 80px, per direct request ("extend
  a little bit further to the right").
- The dot's scale-up used to be pure CSS `:hover`/`:focus-visible`, which only
  fires with the cursor directly over the 14px dot -- not the wider hit area
  around it that reveals the chip. It's now driven off the same `revealed`
  state as the chip (`REVEALED_DOT_SCALE`, an inline `transform`), so hovering
  anywhere in the hit area scales the dot, not just the dot itself.
- The chip was `pointer-events-none` (decorative only); a click there did
  nothing. `onClick` moved from the dot's own `<button>` to the shared
  hit-area wrapper `<div>` (a button's click still bubbles there, so keyboard
  Enter/Space still works unchanged), and `pointer-events-none` was dropped
  from the chip so a click on it also selects the page. `aria-hidden` stays on
  the chip -- its text duplicates the button's own accessible name.

### Wheel remapped: cycles the rail, no longer touches the stack

Built after being interrupted once by the case-study punch list below. Per
the two scoping answers given at the time — **clamp at the ends** (no
wrap-around) and **the stack stays cursor-only** (wheel never fans it open) —
the whole `wheelCapturedRef`/`wheelStepRef`/`wheelDeltaRef` mechanism in
`hooks/useFanProgress.ts` is **deleted outright**, along with
`FAN_WHEEL_STEP_DELTA_PX`, `FAN_WHEEL_STEP_COUNT`, and `travelForWheelStep`
from `lib/fanProgress.ts` (and their tests) — not left as dead code, matching
this project's usual practice for a removed mechanic (see the pull-to-exit
deletion earlier in this file). `useFanProgress`'s `wheelStepCount` parameter
is gone too; `app/page.tsx`'s call site no longer passes it. The now-orphaned
`data-stack-card` attribute (`CaseStudyPreview.tsx`) — it existed solely so
the old wheel handler could detect "cursor moved onto a revealed card" — is
gone as well.

The replacement lives entirely in `PageIndicator.tsx`: a `wheel` listener
(gated on `pointerType === "fine"` and the same `interactive` flag that
already governs the rail's own opacity fade, so it doesn't cycle a rail
nobody can see) accumulates delta the same way the old handler did
(`WHEEL_STEP_DELTA_PX`, a fresh local constant — the old one was deleted with
the rest of `lib/fanProgress.ts`'s wheel code) and steps `revealed` by ±1,
clamped to `[0, caseStudies.length - 1]`. Starting from nothing highlighted,
the first notch lands on the first page scrolling down or the last one
scrolling up, rather than needing a throwaway notch just to establish a
position.

Enter now selects whichever page is highlighted, from any source — hover,
keyboard focus, or the wheel, which (unlike a tabbed-to dot) has no DOM focus
of its own to hang a native activation off. A global `keydown` listener
handles this, but only while `revealed !== null`, and it explicitly steps
aside when `document.activeElement` is the highlighted dot itself — that dot
already gets Enter for free from its own `<button>` (a real browser dispatches
a click, which bubbles to the hit area's `onClick`), and firing both would
select the page twice. jsdom doesn't simulate that native
focused-button-dispatches-click-on-Enter behaviour from a bare `keydown`, so
the regression test for it fires the keydown (asserting `onSelect` is *not*
called by the global handler) and then an explicit `click` (asserting it *is*
called, exactly once) to model what a real browser actually does across both
steps.

### Case study page punch list

All seven items the user listed in one message. Numbers below match the order
they were given in, not necessarily edit order:

1. **Home icon moved back to the left**, over the title, mirroring where it
   sat before an earlier session moved it to the right (over the next-project
   circle). `app/globals.css`'s `.case-study-home` now uses `left:` instead of
   `right:` — same formula, since the header's padding is symmetric
   (`--case-study-header-inline-inset` is shared by both sides already).
2. **The header-rebuild icon animation could replay forward mid-rebuild.**
   `.case-study-home` is `pointer-events: none` while the header is
   collapsed; the moment scrolling back to the top flips that to `auto`, a
   cursor already sitting over the icon's on-screen position is treated as
   freshly entering it (no actual movement needed — this is standard
   pointer-events/hit-testing behaviour, not a bug specific to this site). That
   fired the hover "wiggle" (which always restarts at frame 1), stomping the
   in-progress reverse rebuild and reading as the whole animation playing
   forward again. Fixed in `components/HomeIconAnimation.tsx` with a
   `suppressHoverRef` that blocks hover-replay for 600ms around every `shrunk`
   change (comfortably past the reverse sequence's own ~500ms duration:
   `REBUILD_DELAY_MS` + four `REBUILD_FRAME_DURATION_MS` steps). A genuine
   hover once things have settled still works — see the new regression test
   in `HomeIconAnimation.test.tsx`.
3. **A refresh partway down a case study page used to keep that scroll
   position** (and therefore the collapsed header) — deliberate, per an
   earlier session's own comment ("a reload partway down the page has no
   gesture to read, so go on position"). The user now wants the opposite:
   always land at the top with the full header. `CaseStudyView.tsx` gained a
   `useLayoutEffect` (fires before paint, to minimise any visible snap) that
   sets `history.scrollRestoration = "manual"` and calls `window.scrollTo(0,
   0)` on mount, ahead of the existing scroll-position effect.
4. **The intro subheader now uses PP Neue Montreal** (`font-body font-bold`)
   instead of PP Frama (`font-display`) — `case-study-intro-title` in
   `CaseStudyView.tsx`.
5. **The next-project label is one weight lighter**: `font-bold` (700) →
   `font-medium` (500) on `case-study-next-label`. PP Neue Montreal has real
   400/500/700 weight files registered (`app/layout.tsx`), so 500 is a genuine
   Medium weight, not a synthesised one.
6. **Responsive reorder: subheader → facts → body text**, not facts → (subheader
   + body text) as it was. The subheader `<h2>` is no longer nested inside
   `case-study-detail` — it's now its own sibling grid item alongside
   `case-study-overview` (facts) and `case-study-detail` (overview paragraph +
   sections), all three direct children of `case-study-columns`. Mobile order
   comes from Tailwind `order-1/2/3` (matching DOM order, so reading order for
   assistive tech is unaffected); at `lg:` each gets an explicit
   `col-start`/`row-start` (`lg:order-none` cancels the mobile order) to
   reproduce the original two-column layout — the facts aside additionally
   gets `lg:row-span-2` so it still reads as one continuous left column
   beside both the subheader and the long read beneath it. Spacing between
   all three now comes purely from the grid's own `gap-12`/`lg:gap-20`; the
   now-pointless `.case-study-intro` wrapper (and its `margin-bottom`) and
   `.case-study-intro-copy`'s `margin-top` were removed rather than left as
   dead, double-counted spacing.
7. **The tagline is now `font-body` (PP Neue Montreal) instead of
   `font-script`** (the Adrian handwriting face), and therefore has no
   line-boil (boil is keyed to `.font-script`/`.boil-line` globally — removing
   the class removes the effect for free, no separate opt-out needed). Framed
   by the user as "let's see what it looks like" — a live preview to react to,
   not a confirmed final decision. **Update: reverted.** The user tried it and
   preferred the original — `hero-tagline` is back to `font-script` (the
   Adrian handwriting face, with its line-boil). Don't re-suggest PP Neue
   Montreal for this element without a new reason to revisit it.

Full suite at 451/451 after this batch; `tsc`/`lint` clean.

## Session: OG image, case-study dates/contact, the wheel-floor mechanic, and a much shorter intro (2026-09-03)

**Do not push. See the callout at the top of this file.**

### Placeholder social-share image, and the metadata that was entirely missing

`app/layout.tsx` had only a plain `title`/`description` — no `og:image`, no
Twitter card, so a shared link showed up bare. Added:

- `app/opengraph-image.tsx` — a build-time-generated 1200×630 PNG via
  `next/og`'s `ImageResponse` (ADRIAN in the real PP Frama black weight, on
  the site's own cream, with the tagline underneath). **`export const dynamic
  = "force-static"` is required on this route under `output: "export"`** —
  the build fails without it (`next build` caught this immediately; the
  local Next.js docs didn't mention the requirement, so this needed a real
  build, not just `tsc`, to surface). `app/twitter-image.tsx` re-exports the
  same image under the file-name convention Twitter/X looks for specifically
  — route segment config (`dynamic`) has to be declared literally in that
  file too; it cannot be re-exported, Next.js parses it per-file.
- `metadata.openGraph` / `metadata.twitter` (`card: "summary_large_image"`)
  added alongside the existing title/description.
- `metadata.metadataBase` set to `https://adrianklisz.com` — required to
  resolve the image URLs to an absolute address (`next build` warns loudly
  and falls back to `localhost:3000` without it, which would silently ship a
  broken image URL to production). **This is a guess from the user's email
  domain, not confirmed** — verify it's actually where this deploys before
  trusting the generated URLs.

### About page: real contact links, not placeholder text

`CaseStudyFact.value` (`data/caseStudies.ts`) gained a third shape,
`CaseStudyFactLink[]` (`{ label, href }`), rendered as real `<a>` tags in
`CaseStudyView.tsx`'s fact list (previous shapes — a plain string, or a
plain bulleted `string[]` — render unchanged). `data/about.ts`'s "Say hi"
fact now uses it: `hello@adrianklisz.com` (`mailto:`) and a LinkedIn profile
link. Location, current role, and the bio section are still placeholder —
not asked for, and not something to invent.

### Case study dates, as a second line under Role

Pulled from `docs/case-studies/*.md` — the user's own editing source, which
already had a `Timeline` row per study that never made it into
`data/caseStudies.ts`. Rather than add a fourth fact row, each `Role` value
is now `"<role>\n<dates>"` — a plain string with an embedded newline.
`.case-study-fact dd` already has `white-space: pre-line` (pre-existing
CSS), so this renders as two clean lines with no bullet and needed zero
component changes. If a similar "value reads as two lines" need comes up
again, reach for this pattern before reaching for the bulleted-list one —
they read differently and this one is what "role, then dates" wants.

### The wheel-floor mechanic (attempt three at this interaction, and the one that stuck)

Third redesign of wheel-vs-cursor on the home page this project, worth
reading the arc of if touching it again:

1. Wheel captured and stepped through the stack directly (discrete steps).
   Removed — conflicted with the cursor driving the same fan.
2. Wheel decoupled entirely, remapped to cycling the page-indicator rail
   instead. Built, shipped, then explicitly reverted: **"doesn't feel
   natural... very unexpected."** Lesson: decoupling the wheel from the
   thing it visually looks like it should control (the stack, right there
   on screen) is the wrong instinct even when it resolves the input
   conflict cleanly on paper.
3. **What actually shipped**: the wheel does not decouple from the stack at
   all — cursor position still drives everything, unchanged, exactly as it
   already did (down opens further, up closes, no new logic there). The
   wheel's only job is a one-time kick: scrolling down from closed jumps the
   reveal to "the first card" (`travel = fanSplit` — the exact point where
   the fan finishes opening and the emphasis peak lands on the first case
   study, an existing, meaningful threshold in the interaction model, not an
   arbitrary new constant) without needing the cursor to travel there.

   The real difficulty was that the very next `mousemove` after a wheel
   notch is almost always incidental (a visitor's hand is on the wheel, not
   deliberately steering the cursor at that instant) and would otherwise
   read the cursor's actual, unrelated position and snap the reveal straight
   back to 0. Fixed with `wheelFloorRef` in `hooks/useFanProgress.ts`: the
   wheel sets a floor, not a target. A `mousemove` while a floor is active
   only overrides it if the cursor is genuinely moving *up* (closing is the
   whole point of "cursor up closes it," so that always wins immediately) —
   otherwise the applied value is `Math.max(floor, computedFromCursor)`,
   and the floor clears itself the moment the cursor's own position
   naturally catches up past it. `lastMouseYRef` tracks direction between
   calls to tell "genuine upward move" apart from "cursor happens to be
   somewhere lower right now."

   `PageIndicator`'s wheel-cycling from attempt 2 is fully removed (not left
   dormant) — the wheel does not touch that rail at all any more, per direct
   instruction after the floor mechanic shipped and attempt 2 was still
   partly wired up alongside it (both were firing on the same scroll for one
   turn — worth double-checking old feature removal actually removed the
   *quicker-built version* too, not just the one most recently discussed).

### Card padding

`CaseStudyPreview.tsx`'s sheet copy had asymmetric padding (`pl-10 pr-6
pt-6 pb-10`, wider on the left and bottom than the right and top). Brought
down to symmetric (`pl-6 pr-6 pt-6 pb-6` / `md:pl-10 md:pr-10 md:pt-8
md:pb-8`) per direct request — the tighter pair (right/top) was already
established as the intended baseline; left/bottom were the outliers.

### A much shorter intro: five stages, ~3.4s instead of nine

Replaced the sketch → ascii → warp narrative (9s, each treatment drawing
itself in over 3s) with a quick flip-through: **default (400ms) → sketch,
already finished (1s) → ascii, leaning (1s) → warp, circling (1s) → default.**
Direct motivation: the 9-second version was already flagged as a real cost
("Next steps" list, above) for a returning visitor sitting through the whole
story every load; this resolves it by being fast rather than by gating it on
`sessionStorage`.

- `lib/headlineIntro.ts`: added a `"default"` phase to
  `HeadlineIntroPhase`/`HEADLINE_INTRO_STEPS` (mapped to no active
  treatment in `Hero.tsx` — same fallthrough `null` → resting Warp that
  `"final"` already used, so this needed no new mapping logic at all).
  `HEADLINE_TREATMENT_DURATION_MS` is now 1000ms (was 3000), and
  `HEADLINE_HANDOVER_MS` dropped from 600ms to 250ms — at the old handover
  length, fade alone would have eaten well over half of each new one-second
  beat.
- **Sketch shows itself already drawn, filled, and corrected — no draw-in,
  ever, intro or hover.** `Hero.tsx` now passes `animate={false}`
  unconditionally instead of `animate={!intro.done}`. This does not just
  affect the intro: a *later hover* on sketch was already static by design
  before this change (the old `!intro.done` was already `false` once the
  intro finished), so nothing changed there — the only actual behaviour
  change is that the intro's own sketch beat is now static too.
- **Ascii keeps a single scripted motion — a gentle one-way tilt, left to
  right —but no longer types itself in.** `typeProgress` is now a flat `1`
  instead of being driven by `intro.phaseProgress`; `demoTiltMs` is
  unchanged (still `ASCII_INTRO_DEMO_MS` during the ascii phase). The
  existing tilt behaviour (`demoTiltAt` in `lib/asciiText.ts`, already a
  single one-way lean per its own doc comment) turned out to already be
  exactly what was wanted here — no new ascii-side code needed.
- **Warp gets a new circling motion, replacing the sweep, for this specific
  use.** The old sweep crosses the whole headline end to end — sensible over
  a 2.2s demo, but touring the entire word in a one-second beat would look
  frantic, and it doesn't need to prove anything beyond "this reacts to a
  pointer." `demoCircleAt()` (new, `lib/warpText.ts`) traces a small ellipse
  around the centre in the same 0-1 uv space `demoPointerAt` uses, with the
  radius eased up from centre and back down across the run (a sine
  envelope) so it starts and ends exactly at centre rather than snapping
  onto the circle's edge or stranding the pointer off to one side when the
  demo hands over. `WarpText` gained a `demoMode?: "sweep" | "circle"` prop
  (default `"sweep"`, so every existing caller and test is untouched) read
  through a ref in the same rAF loop as `demoSweepMs`, for the identical
  reason that value is ref'd rather than a dependency (invariant 11, above:
  putting either in the effect's dependency array would rebuild the WebGL
  context to read a primitive). `Hero.tsx` passes `demoMode="circle"` for
  its own warp usage; the sweep function, its constant, and its full
  existing test suite are all still there, untouched, in case anything ever
  wants the old motion back.
- `lib/headlineIntro.test.ts` was rewritten close to fully — the old sketch
  duration and "does the correction mark finish drawing before handover"
  tests no longer apply at all (there's no draw-in to finish inside the
  stage any more). `hooks/useHeadlineIntro.test.ts` and `app/page.test.tsx`
  needed small fixes for the shifted starting phase (`"default"` first, not
  `"sketch"`) — the latter had a checked-in comment ("assert the frame is
  present rather than one particular treatment") that the assertion right
  below it didn't actually follow; fixed to match its own stated intent
  (assert on the always-mounted `warp-text`, not a specific phase's testid).

Full suite at 458/458 after this session; `tsc`/`lint`/`next build` all
clean. Verified with a real production build, not just `tsc` — the
`opengraph-image` static-export requirement above would not have surfaced
otherwise.

### Then five rapid rounds of timing tuning, ending in a hard cut

Once the shorter intro above was live, timing got tuned in quick succession,
each request landing on the same handful of exported constants in
`lib/headlineIntro.ts`:

1. "faster transitions" → `HEADLINE_HANDOVER_MS` cut from 250ms toward 150ms.
2. "linger on default for 1s, then 1.5s per treatment" →
   `DEFAULT_INTRO_DURATION_MS` = 1000, `HEADLINE_TREATMENT_DURATION_MS` =
   1500.
3. "should feel glitchy" → the crossfade was replaced with `glitchFlicker()`,
   a smoothstep envelope perturbed by a decaying sine (`HANDOVER_FLICKER_CYCLES
   = 2.5`), so a handover stutters instead of dissolving. Framed at the time
   as a first pass since it couldn't be seen running.
4. "make each treatment last 400ms" → `HEADLINE_TREATMENT_DURATION_MS` = 400.
5. **"harsher — no crossfade, should feel like they're flashing by"** →
   `HEADLINE_HANDOVER_MS` set to **0**. `handoverOpacityAt` now short-circuits
   (`if (half <= 0) return 1`) rather than dividing by zero, so every
   handover is a true hard cut with opacity pinned at 1 throughout —
   including exactly on a boundary, where it used to be pinned at 0 instead.
   `introStateAt`'s "done" check no longer waits an extra half-handover past
   the last boundary, since there's no trailing fade-in left to finish.

`glitchFlicker` was left in place and exported rather than deleted — it's a
tunable currently dialed to zero-effect (any nonzero `HEADLINE_HANDOVER_MS`
brings it back), not abandoned code. `lib/headlineIntro.test.ts` now pins its
start/end/clamping/non-monotonic shape directly against `t`, independent of
whatever the live handover constant is set to.

**Worth watching for, unverified:** the hard cut gives up the fade's other
job — hiding a treatment mid-mount before its own WebGL/SVG has initialised.
Warp stays mounted throughout the intro and was never at risk from this, but
ASCII and Stroke fully mount and unmount on every swap. If a swap *into*
ascii or sketch shows a one-frame flash of unstyled fallback text now, that's
this trade — needs a look in a real browser, not just the test suite.

Full suite at 459/459; `tsc`/`lint` clean. `next build` not re-run for this
specific batch (no static-export-sensitive files touched).

### The default stage joins the others' beat, and a warp bug the request surfaced

"Make the default treatment last the same time as the others" — rather than
give `DEFAULT_INTRO_DURATION_MS` its own value equal to
`HEADLINE_TREATMENT_DURATION_MS` (400), it now derives from that constant
directly, so retuning the shared beat again moves every stage including the
opening one without a second edit.

Then "make the cursor in warp only move a few pixels, very subtle" —
`WARP_DEMO_CIRCLE_RADIUS_X/Y` (`lib/warpText.ts`) dropped from 0.14/0.1 to
0.015/0.01 (uv-space fractions of the rendered headline).

That second request, tuning the demo circle's radius, is what surfaced a real
bug the small radius made obvious: **the resting headline kept a faint warp
distortion after the intro ended, instead of settling to plain undistorted
text.** Root cause, in `components/WarpText.tsx`: the effect that reacts to
`demoSweepMs` nulls `demoSweepStartedAtRef` the instant the prop drops to 0
(when Hero leaves the warp phase). The render loop's only recentring branch
required that same ref to still be non-null — a condition that same effect
had just made false, in the same tick. Both clocks (React's intro-phase
timer and WarpText's own internal one) are aiming at the same duration, so
the prop update usually beat the loop to noticing the demo had ended,
leaving `pointer.strength` (which drives `uHover`/`uPointerActive`, and with
it the ambient noise warp — not just the pointer lens) parked wherever the
demo had last eased it toward, i.e. still on. A race, not a one-off glitch —
which is why it wasn't obviously visible with the old, much larger radius.

Fixed with an explicit one-shot signal instead of relying on the loop to
notice in time: `demoEndRequestRef` (a counter) increments inside that same
effect whenever `demoSweepMs` transitions from active to 0. The render loop
compares it against a locally-held `handledEndRequest` each frame and, on a
change, forces `pointer.targetX/Y` back to centre and `targetStrength` to 0
exactly once — independent of whichever clock happens to notice first. The
old natural-expiry recentring branch (for a demo left to run past its own
duration without the prop ever clearing) is kept alongside it, since it's
still reachable for a caller other than Hero.

Not covered by an automated test: `WarpText.test.tsx` only exercises the
DOM fallback, since `typeof WebGL2RenderingContext === "undefined"` in
jsdom bails out of the whole renderer/rAF effect before this code ever runs
— the same reason the demo-mode ref-reading pattern earlier in this file
went untested too. Needs a look in a real browser to confirm the resting
Warp headline is now clean after the intro finishes.

Full suite at 459/459 (unchanged — no new coverage was possible here);
`tsc`/`lint` clean.

### Faster transitions, and a lift that had gone missing

"Make the default treatment last the same time as the others" turned into a
couple more rounds of live tuning against the running dev server:
`HEADLINE_TREATMENT_DURATION_MS` went 400 → 250 ("faster transitions
please") → 350 ("a little slower, maybe 350") — each checked directly in the
browser rather than described, since Turbopack hot-reloads the change
instantly.

That surfaced **"the sketch treatment is sitting a bit lower than the
others"** — a real regression, not a new ask. `STROKE_INK_LIFT_PX = 12`
(`lib/strokeText.ts`) was a calibrated nudge (added in `5a84705`, the commit
that first aligned sketch's ink-centring against ascii) that made the
sketch's vertical centring match the other treatments' — without it,
`inkCentringOffset` centres on the *true* glyph ink, which reads a shade
lower than where ascii/warp's own metric-based centring happens to land.
It had been silently dropped from this session's still-uncommitted working
tree: the Firefox-outline-wipe edits to `components/StrokeText.tsx` touched
the same import block and the same `inkCentringOffset(...)` call site as an
earlier, legitimately-reverted fix (the correction-mark `writeBelow`
change), and the constant went out with it by accident. Restored both the
constant and its use (`inkCentringOffset(box, centreY, STROKE_INK_LIFT_PX)`)
— nothing else from that revert was touched.

**Worth remembering:** this session's `lib/strokeText.ts` /
`components/StrokeText.tsx` changes were never committed, so `git diff`
against HEAD is the fastest way to audit exactly what this session has
changed in a file — that diff is what caught this.

Full suite at 459/459; `tsc`/`lint` clean.

### The hard cut catching ascii mid-lean

"Now it looks like ascii is sitting a bit low and maybe a bit to the right" —
a second regression the hard-cut change (above) quietly created, this time
in `demoTiltAt` (`lib/asciiText.ts`). Its scripted lean was designed to ease
up to its peak angle and **hold there**, relying on the handover fade to
disappear before anyone clocked it frozen mid-tilt — a design the file's own
old comment stated outright. `ASCII_INTRO_DEMO_MS` is defined as
`ASCII_INTRO_DURATION_MS - HEADLINE_HANDOVER_MS / 2`, which used to reserve a
sliver of the stage after the sweep for exactly this settle; at
`HEADLINE_HANDOVER_MS = 0` that reserve is also 0, so the lean is still
sitting at its peak on the exact frame the hard cut fires. A tilted plane on
a perspective camera reads as shifted and shrunk, not just angled — which is
what "low and to the right" was.

Fixed at the source rather than by clawing back settle time (the component's
pointer-easing rate needs the better part of a second to visibly settle,
which no longer fits in a 350ms stage regardless): `demoTiltAt`'s envelope
changed from a one-way ease-and-hold (`phase * phase * (3 - 2 * phase)`,
0 → 1) to a rise-and-return one (`Math.sin(phase * Math.PI)`, 0 → 1 → 0) --
the same shape `demoCircleAt` already uses for warp's demo, for the same
reason: whatever a scripted demo does, it needs to be back at rest by its
own end now, since nothing hides the moment it hands off. It still never
leans the other way (the sine stays non-negative over its domain), so the
one-direction-only design this replaced is preserved -- it just no longer
gets stuck at the far end of it. `lib/asciiText.test.ts`'s old "never
doubling back" test asserted the previous hold-forever shape directly and
had to go; replaced with tests for the new peak-then-relax shape and for
landing back near level before the duration is up.

Full suite at 460/460 (one net new test); `tsc`/`lint` clean. Not yet
re-checked in a real browser — the WebGL renderer this drives can't be
reached by jsdom, same caveat as the warp fix above.

### Ascii's static texture centring: advance width isn't ink width

The tilt fix above didn't fully explain it: "the ascii is still sitting a few
px low and a few px to the right" persisted even without any lean in play,
pointing at the texture's own static layout rather than the demo motion.

`textTextureLayout` (`lib/asciiText.ts`) already centred vertically on tight
ink bounds (`actualBoundingBoxAscent`/`Descent`) — provably symmetric
regardless of their actual values, by construction. Horizontally it centred
on `metrics.width` instead: the glyph run's *advance* width, not its ink
width. A bold display face's left and right side bearings are rarely equal,
so the tight ink doesn't sit centred within its own advance box — centring
margins around that box left the ink itself a few pixels off from where the
margins implied it should be. The exact same metrics-box-vs-ink-box mismatch
already found and fixed for the sketch treatment's vertical centring
(`STROKE_INK_LIFT_PX`, above), just on the other axis and a different
treatment.

Fixed by switching `textTextureLayout` to take `inkLeftPx`/`inkRightPx`
(canvas's `actualBoundingBoxLeft`/`Right`) instead of a single advance width,
centring the margins on `inkLeftPx + inkRightPx` and anchoring `baseX` at
`marginX + inkLeftPx` — the same shape of fix as the vertical side, applied
to the axis that was still missing it. `ASCIIText.tsx`'s call site passes
the two bounding-box metrics instead of `metrics.width`. The existing test
for this function used equal-ish left/right anyway, which is exactly why it
couldn't have caught this: rewrote it with deliberately asymmetric
`inkLeftPx`/`inkRightPx` (3.2 / 1379.24) so the assertions actually
distinguish "centred on the ink" from "centred on the advance box".

Full suite at 460/460; `tsc`/`lint` clean. Also not browser-verified yet —
worth confirming both this and the tilt fix above together, since either one
being incomplete could still look like "a few px off" on its own.

### The actual root cause: "default" itself was never ink-centred

Restoring, then re-tuning `STROKE_INK_LIFT_PX` (12 → 6) chased a symptom
without asking why a fudge constant was needed at all. The request that
followed named the real requirement directly: **"the illusion I'm trying to
recreate is that when the treatments apply, the word stays perfectly still,
it's just viewed from another lens — size and position must stay exactly
the same."** That reframes this from "does sketch look about right" to "do
all four treatments target the literal same point" — and the answer was no.

The "default" treatment — what a visitor sees with no hover, and what every
other treatment is implicitly judged against — is warp at rest (it's the
one treatment that never remounts; Hero falls through to it whenever no
effect is active). Its text layout, in `drawTextCanvas`
(`components/WarpText.tsx`), turned out to have exactly the same two bugs
just fixed elsewhere, undiagnosed because nobody had reason to doubt the
baseline itself:

- Horizontally, it centred each character's cursor on the summed *advance*
  width (`measure()`), not the run's tight ink bounds.
- Vertically, it used `textBaseline = "middle"`, which centres on the
  font's ascent/descent *metrics*, not the rendered ink either.

So the very treatment everything else was being tuned to match was itself
off-centre by the same bearing/metrics slop as sketch and ascii — which is
why `STROKE_INK_LIFT_PX` needed hand-tuning at all: it was compensating for
warp's own drift, not sketch's. No empirical constant tuned against a moving
target was ever going to land cleanly.

Fixed at the root: added `centeredRunLayout` (`lib/warpText.ts`), a pure
function that takes each character's canvas `TextMetrics`
(`actualBoundingBoxLeft/Right/Ascent/Descent`, plus its advance) and returns
where to draw each character, and the shared baseline y, so that the whole
run's *combined* tight ink span — not any single character's, and not the
advance box — sits exactly centred in the host on both axes.
`drawTextCanvas` now measures each character, calls this, and draws with
`textBaseline = "alphabetic"` at the computed positions instead of
`"middle"` at a naive advance-centred cursor. Fully unit tested (asymmetric
per-character bearings, multi-character combined-span centring, the shared
baseline placement, an empty-run guard, and a sanity check against the easy
symmetric case) since the WebGL canvas itself can't be reached from jsdom
the way the underlying math now can be.

With warp itself now ink-centred on both axes, sketch's horizontal centring
got the matching fix it had never needed before warp moved: SVG's
`text-anchor="middle"` has the identical advance-box-not-ink problem, just
unnoticed because nothing had flagged it yet. Added `inkCentringOffsetX`
(`lib/strokeText.ts`), mirroring the existing vertical `inkCentringOffset`,
and applied it alongside the existing vertical offset in the same wrapping
`<g transform="translate(x, y)">` in `components/StrokeText.tsx`.
`STROKE_INK_LIFT_PX` is now `0` (kept, not deleted, as a tunable) — with
both treatments centring on the same literal definition of "centre," it
should no longer be needed at all.

ASCII needed no further change: its texture-layout fix from earlier in this
session was already centring on tight ink bounds on both axes, which is now
confirmed to be the *correct* target rather than a coincidentally-close one.

Full suite at 470/470 (10 net new tests, all pure and jsdom-safe); `tsc`/
`lint` clean. This is the deepest of today's fixes and the most in need of a
real look in the browser: check all three treatments (plus default/warp
itself at rest) against a ruler or overlay, not just each other, since
"matches its neighbour" was exactly the kind of comparison that let warp's
own drift go unnoticed this whole time.
