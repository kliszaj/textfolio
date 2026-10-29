"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { CaseStudyFocus } from "@/components/CaseStudyFocus";
import { CircularText } from "@/components/CircularText";
import { PageIndicator } from "@/components/PageIndicator";
import { caseStudies, caseStudyRoute } from "@/data/caseStudies";
import type { CaseStudy } from "@/data/caseStudies";
import { DEFAULT_FOCUS_VARIANT_ID } from "@/lib/focusVariants";
import { DeskClock, useDeskTime } from "./DeskClock";
import { sceneForHour } from "@/lib/workspace/scenes";
import { gradientCSS, useDeskGradients } from "./DeskGradients";
import { useDeskTwilight } from "./DeskTwilight";
import { useDuskSky } from "./DuskSky";
import { DeskFramingControls, useDeskFraming, useDeskColors } from "./DeskFraming";
import {
  markDeskSession,
  noteDeskReturn,
  registerDeskPreparer,
  setArrivingFromDesk,
  takeDeskReturn,
} from "@/lib/deskSession";
import { createStepGesture } from "@/lib/deskGestures";
import { usePointerType } from "@/hooks/usePointerType";
import { DeskHint, useDeskHint } from "./DeskHint";
import { DeskModel, type ScreenPose } from "./DeskModel";
import { DeskLighting, WindowLight } from "./DeskLighting";
import { AdaptiveTextSampler } from "./adaptiveText";
import { CameraRig } from "./CameraRig";
import { ScreenSurface } from "./ScreenSurface";
import { TypingApp } from "./typing/TypingApp";
import { useTypingTest } from "./typing/useTypingTest";
import {
  FOV,
  SHEETS,
  browserLayout,
  findSheet,
  typingWindow,
  type DeskVariant,
  type Destination,
  type Phase,
  type Viewport,
} from "./deskLayout";

export type { DeskVariant } from "./deskLayout";

// A freshly loaded case study opens its header full-bleed and settles over
// 620ms. Coming back, the monitor waits that out so it shows the page at rest.
const PAGE_SETTLE_MS = 700;
const PREPARE_TIMEOUT_MS = 4000;
// Changing the time of day swaps the case study on the monitor last, once the
// clock, furniture and light have settled.
const SCREEN_SWAP_DELAY_MS = 1300;
// Wheel travel that counts as one step, the pause after a step (the clock's
// own animation), and the quiet gap that ends a scroll gesture.
const WHEEL_STEP_PX = 40;
const WHEEL_STEP_LOCK_MS = 700;
const WHEEL_GESTURE_GAP_MS = 250;
// The UI around the desk waits for the loader to finish fading out, then
// comes in one piece after another.
const UI_REVEAL_DELAY_MS = 500;
const UI_REVEAL_STAGGER_MS = 140;
// The settings panel is a tuning tool, not something visitors should meet.
const SHOW_DESK_SETTINGS = process.env.NODE_ENV !== "production";

// Text over the stage background is plain ink or cream, never blended.
const INK = "#1c1c1c";
const CREAM = "#F5EDE6";
// WCAG relative luminance; three.js keeps colour components linear.
const luminance = (color: THREE.Color) => 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
const INK_LUMINANCE = luminance(new THREE.Color(INK));
const CREAM_LUMINANCE = luminance(new THREE.Color(CREAM));

export function DeskStage({ variant, active = true }: { variant: DeskVariant; active?: boolean }) {
  const router = useRouter();
  const [screen, setScreen] = useState<ScreenPose | null>(null);
  const clock = useDeskTime();
  const hint = useDeskHint();
  const typing = useTypingTest();
  const { framing, update: updateFraming } = useDeskFraming();
  const { colors, updateColors } = useDeskColors();
  const { gradients, updateGradients } = useDeskGradients();
  const { twilight, updateTwilight } = useDeskTwilight();
  const dusk = useDuskSky({
    twilight,
    afternoon: colors.afternoon,
    night: colors.night,
    horizon: clock.solar?.horizonMix ?? 0,
    nightMix: clock.solar?.backgroundNightMix ?? 0,
  });
  const background = useMemo(() => {
    const horizon = clock.solar?.horizonMix ?? 0;
    const night = clock.solar?.backgroundNightMix ?? 0;
    const morning = clock.solar?.morning ?? true;
    const nightColor = new THREE.Color(colors.night);
    // The name and clock sit bottom right; pick whichever of ink or cream
    // contrasts more with the colour behind them.
    const textOver = (color: THREE.Color) => {
      const corner = luminance(color);
      const contrast = (text: number) => (Math.max(corner, text) + 0.05) / (Math.min(corner, text) + 0.05);
      return contrast(CREAM_LUMINANCE) > contrast(INK_LUMINANCE) ? CREAM : INK;
    };

    // Evening is drawn by the dusk sky layer (DuskSky), in the chosen style.
    if (!morning) return { image: "none", text: textOver(dusk.corner), evening: true };

    const top = new THREE.Color(colors.afternoon)
      .lerp(new THREE.Color(colors.morning), horizon)
      .lerp(nightColor, night);
    const bottom = new THREE.Color(colors.afternoon)
      .lerp(new THREE.Color(colors.sunriseGlow), horizon)
      .lerp(nightColor, night);
    const gradient = gradients.morning;
    return {
      image: gradientCSS(gradient, top.getStyle(), bottom.getStyle()),
      // The name and clock sit over the gradient's far colour.
      text: textOver(gradient.swap ? top : bottom),
      evening: false,
    };
  }, [clock.solar, colors, gradients, dusk.corner]);
  const [caseStudy, setCaseStudy] = useState<CaseStudy | null>(null);
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [startZoomed, setStartZoomed] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [destination, setDestination] = useState<Destination>({ kind: "monitor" });
  // Loading the case study being left onto the monitor while still hidden.
  const [preparing, setPreparing] = useState(false);
  const finishPreparing = useRef<(() => void) | null>(null);
  const initialized = useRef(false);
  const wasActive = useRef(active);

  // Picked after mount so the server render and first client render agree.
  // Coming back from a case study the desk wasn't mounted for (a refresh)
  // restores it to the monitor and starts zoomed in, so the camera can pull
  // back out. Once per mount: the note is consumed on read, and Strict Mode
  // re-runs effects.
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (variant === "browser") markDeskSession();
    const [kind, slug] = takeDeskReturn()?.split(":") ?? [];
    const returning =
      (variant === "browser" && kind === "monitor") || (variant === "zoom" && kind === "case-study")
        ? findSheet(slug)
        : undefined;
    setStartZoomed(Boolean(returning));
    setPhase(returning ? "returning" : "idle");
    setCaseStudy(returning ?? findSheet("spotify-jam") ?? caseStudies[0]);
  }, [variant]);

  useEffect(() => {
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Warm every possible destination so the push at the end of a zoom lands
  // instantly, as textfolio's own Home does for its stack.
  useEffect(() => {
    if (!caseStudy) return;
    const routes = variant === "browser" ? SHEETS.map(caseStudyRoute) : [caseStudyRoute(caseStudy)];
    routes.forEach((route) => router.prefetch(route));
  }, [caseStudy, router, variant]);

  // Home on a case study asks the hidden desk to show that case study, and
  // waits until it is loaded and settled before switching back.
  useEffect(() => {
    if (variant !== "browser") return;
    return registerDeskPreparer((slug) => new Promise<void>((resolve) => {
      const finish = () => {
        window.clearTimeout(timeout);
        finishPreparing.current = null;
        resolve();
      };
      const timeout = window.setTimeout(finish, PREPARE_TIMEOUT_MS);
      finishPreparing.current = finish;
      const sheet = findSheet(slug);
      if (sheet) setCaseStudy(sheet);
      setPreparing(true);
    }));
  }, [variant]);

  const onPageLoad = useCallback(() => {
    const finish = finishPreparing.current;
    if (finish) window.setTimeout(finish, PAGE_SETTLE_MS);
  }, []);

  // Back on the desk: the camera is still zoomed into the monitor from the
  // trip in, so pull back out.
  useEffect(() => {
    if (active && !wasActive.current) {
      takeDeskReturn();
      setPreparing(false);
      setDestination({ kind: "monitor" });
      setPhase("returning");
    }
    wasActive.current = active;
  }, [active]);

  const leave = useCallback(() => setPhase("returning"), []);

  // A different time of day puts the next case study (or the previous one)
  // up on the monitor too, as the last thing to change. Rapid steps add up
  // and swap once.
  const pendingSheet = useRef<CaseStudy | null>(null);
  const swapTimer = useRef<number | null>(null);
  const cancelSwap = useCallback(() => {
    if (swapTimer.current !== null) window.clearTimeout(swapTimer.current);
    swapTimer.current = null;
    pendingSheet.current = null;
  }, []);
  useEffect(() => cancelSwap, [cancelSwap]);
  const stepTime = (direction: -1 | 1) => {
    hint.markUsed();
    clock.step(direction);
    const from = pendingSheet.current ?? caseStudy;
    const index = caseStudies.findIndex((sheet) => sheet.slug === from?.slug);
    pendingSheet.current = caseStudies[(index + direction + caseStudies.length) % caseStudies.length];
    if (swapTimer.current !== null) window.clearTimeout(swapTimer.current);
    swapTimer.current = window.setTimeout(() => {
      setCaseStudy(pendingSheet.current);
      pendingSheet.current = null;
      swapTimer.current = null;
    }, SCREEN_SWAP_DELAY_MS);
  };

  useEffect(() => {
    if (variant !== "screen" || phase !== "focused") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") leave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant, phase, leave]);

  // Scrolling steps through the day: down for later, up for earlier. One
  // gesture is one step, so a trackpad's momentum tail can't run on through
  // several, and the lock holds for as long as the events keep coming.
  const wheelSteps = useRef(createStepGesture({ stepPx: WHEEL_STEP_PX, lockMs: WHEEL_STEP_LOCK_MS, gapMs: WHEEL_GESTURE_GAP_MS }));
  const onWheel = (event: React.WheelEvent) => {
    if (!active || phase !== "idle") return;
    if (event.target instanceof Element && event.target.closest("[data-desk-settings]")) return;
    const step = wheelSteps.current.push(event, performance.now());
    if (step !== 0) stepTime(step);
  };

  // The arrow keys step through the day too, for anyone not on a wheel.
  const stepTimeRef = useRef(stepTime);
  useEffect(() => {
    stepTimeRef.current = stepTime;
  });
  useEffect(() => {
    if (!active || phase !== "idle") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest("input, select, textarea, [data-desk-settings]")) return;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") stepTimeRef.current(1);
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") stepTimeRef.current(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, phase]);

  const zoomTo = useCallback((next: Destination) => {
    // Land on the page that was on screen when tapped.
    cancelSwap();
    setDestination(next);
    setPhase("zooming");
  }, [cancelSwap]);

  const arrive = useCallback(() => {
    setPhase("focused");
    if (variant === "browser" && destination.kind === "monitor" && caseStudy) {
      setArrivingFromDesk();
      router.push(caseStudyRoute(caseStudy));
    }
  }, [variant, destination, caseStudy, router]);

  const ready = screen !== null && caseStudy !== null && viewport !== null;
  const touch = usePointerType() === "coarse";
  // Once only: coming back from a case study, the UI is simply there.
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!ready || revealed) return;
    const timer = window.setTimeout(() => setRevealed(true), UI_REVEAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [ready, revealed]);
  const layout = useMemo(() => (viewport && variant === "browser" ? browserLayout(viewport) : null), [viewport, variant]);
  const openMonitor = useCallback(() => zoomTo({ kind: "monitor" }), [zoomTo]);

  // The keyboard opens a typing test as an app window on the monitor. The
  // camera zooms to it; once it lands, a flat copy laid exactly over it takes
  // the input (text in the 3D layer renders soft), and Esc zooms back out.
  const typingOpen = destination.kind === "typing";
  const typingBox = layout && viewport ? typingWindow(layout, viewport) : null;
  const markHintUsed = hint.markUsed;
  const restartTyping = typing.restart;
  const typingView = typing.view;
  const hideBoard = typing.hideBoard;
  const openTyping = useCallback(() => {
    markHintUsed();
    restartTyping();
    zoomTo({ kind: "typing" });
  }, [markHintUsed, restartTyping, zoomTo]);
  const closeTyping = useCallback(() => setPhase((current) => (current === "focused" ? "returning" : current)), []);
  useEffect(() => {
    if (!typingOpen || phase !== "focused") return;
    // Esc steps back: out of the leaderboard view first, then to the desk.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (typingView === "board") hideBoard();
      else closeTyping();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [typingOpen, phase, closeTyping, typingView, hideBoard]);
  // The case study the lift animation opens into, once a zoom has arrived.
  const focusTarget = !active || phase !== "focused"
    ? null
    : variant === "zoom"
      ? caseStudy
      : variant === "browser" && destination.kind === "caseStudy"
        ? destination.caseStudy
        : null;

  return (
    <div
      className="fixed inset-0 bg-cream text-ink"
      // Hidden behind an open case study, not unmounted: opacity rather than
      // visibility, which the screen's own visibility toggle would override.
      inert={!active}
      onWheel={onWheel}
      style={{ opacity: active ? 1 : 0, zIndex: active ? undefined : -1,
        backgroundColor: colors.afternoon,
        backgroundImage: background.image,
        color: background.text,
        // Not while loading: the first clock reading would otherwise ease in
        // from daytime colours, and stall there while the desk is built.
        transition: ready ? "background-color 800ms ease, color 800ms ease" : "none" }}
    >
      {background.evening && <div aria-hidden="true" className="pointer-events-none absolute inset-0">{dusk.node}</div>}
      <Canvas
        shadows
        dpr={[1, 2]}
        // On demand: a desk at rest draws nothing. What moves asks for
        // frames itself (see renderOnDemand).
        frameloop={active ? "demand" : "never"}
        // preserveDrawingBuffer: AdaptiveTextSampler reads the last frame
        // back, after it has been shown, to see what is behind each letter.
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        // The shadow map is redrawn only while the light or the furniture
        // moves (useRenderAfterChange's shadows), not on every frame.
        onCreated={({ gl }) => {
          gl.shadowMap.autoUpdate = false;
          gl.shadowMap.needsUpdate = true;
        }}
        camera={{ fov: FOV, near: 0.05, far: 50, position: [2.2, 1.9, 3.6] }}
        // The on-screen HTML lives inside the canvas container, so its clicks
        // bubble here too. Only a click on the canvas itself means "outside".
        onPointerMissed={(event) => {
          if (!(event.target instanceof HTMLCanvasElement)) return;
          if (variant === "screen" && phase === "focused") leave();
        }}
        style={{
          opacity: ready ? 1 : 0,
          transition: "opacity 600ms ease",
          cursor: phase === "idle" ? "grab" : undefined,
        }}
      >
        <AdaptiveTextSampler base={background.text} />
        <DeskLighting solar={clock.solar} screen={screen} />
        <WindowLight solar={clock.solar} glow={twilight.glow} enabled={twilight.style === "window"} />
        <Suspense fallback={null}>
          <DeskModel
            onScreen={setScreen}
            hour={clock.sceneHour}
            darkness={clock.solar?.darkness ?? 0}
            onKeyboardClick={variant === "browser" && active && phase === "idle" ? openTyping : undefined}
          />
        </Suspense>
        {ready && (
          <>
            <ScreenSurface
              screen={screen}
              caseStudy={caseStudy}
              layout={layout}
              viewport={viewport}
              phase={phase}
              variant={variant}
              // Unloaded while a case study is open; reloaded to come back.
              mountBrowserPage={active || preparing}
              darkness={clock.solar?.darkness ?? 0}
              scene={sceneForHour(clock.sceneHour)}
              onPageLoad={onPageLoad}
              onOpen={openMonitor}
            >
              {/* Always mounted, so it fades in as the zoom starts and out
                  once the camera is back, every time. Hidden while the flat
                  copy is in use. */}
              {variant === "browser" && typingBox && (
                <TypingApp
                  state={typing.state}
                  now={typing.now}
                  duration={typing.duration}
                  interactive={false}
                  frozen={!typingOpen || phase === "focused"}
                  style={{
                    left: typingBox.left,
                    top: typingBox.top,
                    width: typingBox.width,
                    height: typingBox.height,
                    pointerEvents: "none",
                    opacity: typingOpen && (phase === "zooming" || phase === "returning") ? 1 : 0,
                    transform: typingOpen && phase !== "idle" ? "none" : "scale(0.96)",
                    transition: phase === "zooming" || phase === "idle"
                      ? "opacity 300ms ease, transform 450ms cubic-bezier(0.22, 1, 0.36, 1)"
                      : "none",
                  }}
                  onInput={typing.input}
                  onRestart={typing.restart}
                  onClose={closeTyping}
                  leaderboard={typing.leaderboard}
                  onName={typing.setName}
                  onSubmit={typing.submit}
                  onRetryBoard={typing.retryBoard}
                  view={typing.view}
                  browse={typing.browse}
                  onShowBoard={typing.showBoard}
                  onHideBoard={typing.hideBoard}
                />
              )}
            </ScreenSurface>
            <CameraRig
              framing={framing}
              screen={screen}
              layout={layout}
              phase={phase}
              variant={variant}
              startZoomed={startZoomed}
              onArrive={arrive}
              onReturned={() => setPhase("idle")}
              onOrbitStart={hint.markUsed}
              zoomTarget={typingOpen ? "typing" : "page"}
            />
          </>
        )}
      </Canvas>

      {/* office-portfolio's spinning loader, fading out as the desk fades in. */}
      <div
        role="status"
        aria-label="Loading the desk"
        className="pointer-events-none absolute inset-0 grid place-items-center transition-[opacity,visibility] duration-500"
        style={{
          opacity: ready ? 0 : 1,
          visibility: ready ? "hidden" : "visible",
          // The same ink or cream as the name, so it reads on any background.
          "--circular-text-color": background.text,
        } as React.CSSProperties}
      >
        {/* A fixed 200px ring; three quarters of that on a phone. */}
        <div className="scale-75 md:scale-100">
          <CircularText text="LOADING*LOADING*" spinDuration={8} />
        </div>
      </div>

      {/* textfolio's own rail, beside the desk. PageIndicator offsets itself
          for Home's overscanned hero sheet, so give it a frame shifted by the
          same overscan. */}
      {variant === "browser" && ready && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: phase === "idle" ? 1 : 0,
            visibility: phase === "idle" ? "visible" : "hidden",
          }}
        >
          <div className="desk-reveal absolute inset-0" data-shown={revealed}>
            <PageIndicator
              align="right"
              caseStudies={SHEETS}
              // The one already on the monitor needs no reveal: zoom straight in.
              onSelect={(picked) => zoomTo(picked.slug === caseStudy?.slug ? { kind: "monitor" } : { kind: "caseStudy", caseStudy: picked })}
            />
          </div>
        </div>
      )}

      {/* Fade with the rail rather than vanishing as a zoom starts. */}
      <div
        className="transition-[opacity,visibility] duration-300"
        style={{ opacity: phase === "idle" ? 1 : 0, visibility: phase === "idle" ? "visible" : "hidden" }}
      >
        {/* Full-stage layers, so the clock and settings keep positioning
            against the stage rather than against the blur's own box. */}
        <div
          className="desk-reveal pointer-events-none absolute inset-0 [&>*]:pointer-events-auto"
          data-shown={revealed}
          style={{ transitionDelay: revealed ? `${UI_REVEAL_STAGGER_MS}ms` : undefined }}
        >
          <DeskClock clock={clock} touch={touch} />
        </div>
        <DeskHint show={hint.show} touch={touch} revealed={revealed} />
        {SHOW_DESK_SETTINGS && (
          <div
            className="desk-reveal pointer-events-none absolute inset-0 [&>*]:pointer-events-auto"
            data-shown={revealed}
            style={{ transitionDelay: revealed ? `${UI_REVEAL_STAGGER_MS * 2}ms` : undefined }}
          >
            <DeskFramingControls framing={framing} onChange={updateFraming} colors={colors} onColorsChange={updateColors} gradients={gradients} onGradientsChange={updateGradients} twilight={twilight} onTwilightChange={updateTwilight} onShowSunset={clock.showSunset} />
          </div>
        )}
      </div>

      {variant === "screen" && phase === "focused" && (
        <button
          type="button"
          onClick={leave}
          className="absolute top-6 right-6 z-30 cursor-pointer rounded-full bg-ink px-5 py-3 font-body text-base font-medium text-cream"
        >
          Back to desk
        </button>
      )}

      {typingOpen && phase === "focused" && active && typingBox && (
        <div className="absolute inset-0 z-30">
          <TypingApp
            state={typing.state}
            now={typing.now}
            duration={typing.duration}
            interactive
            style={{
              left: typingBox.overlayLeft,
              top: typingBox.overlayTop,
              width: typingBox.width,
              height: typingBox.height,
              transform: `scale(${typingBox.scale})`,
              transformOrigin: "0 0",
            }}
            onInput={typing.input}
            onRestart={typing.restart}
            onClose={closeTyping}
            leaderboard={typing.leaderboard}
            onName={typing.setName}
            onSubmit={typing.submit}
                  onRetryBoard={typing.retryBoard}
                  view={typing.view}
                  browse={typing.browse}
                  onShowBoard={typing.showBoard}
                  onHideBoard={typing.hideBoard}
          />
        </div>
      )}

      {focusTarget && (
        <CaseStudyFocus
          caseStudy={focusTarget}
          variantId={DEFAULT_FOCUS_VARIANT_ID}
          origin={{ xPercent: 50, yPercent: variant === "browser" ? 85 : 50 }}
          onEntered={() => {
            if (variant === "zoom") noteDeskReturn(`case-study:${focusTarget.slug}`);
            router.push(caseStudyRoute(focusTarget));
          }}
        />
      )}
    </div>
  );
}
