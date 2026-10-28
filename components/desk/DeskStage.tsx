"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { ComponentRef } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { CaseStudyFocus } from "@/components/CaseStudyFocus";
import { PageIndicator } from "@/components/PageIndicator";
import { caseStudies, caseStudyRoute } from "@/data/caseStudies";
import type { CaseStudy } from "@/data/caseStudies";
import { ABOUT_PAGE } from "@/data/about";
import { DEFAULT_FOCUS_VARIANT_ID } from "@/lib/focusVariants";
import { SHEET_OVERSCAN_PERCENT } from "@/lib/fanSheet";
import {
  markDeskSession,
  noteDeskReturn,
  registerDeskPreparer,
  setArrivingFromDesk,
  takeDeskReturn,
} from "@/lib/deskSession";
import { DeskModel, type ScreenPose } from "./DeskModel";

// "screen": the case study opens on the monitor itself (Henry-style).
// "zoom": the camera pushes through the monitor into the real case study page.
// "browser": the monitor runs a case study in a browser window; a tap zooms
// through it into the real page, and its Home icon zooms back out.
export type DeskVariant = "screen" | "zoom" | "browser";
type Phase = "idle" | "zooming" | "focused" | "returning";
type Viewport = { w: number; h: number };
// Where a zoom into the browser window ends: the case study on the monitor,
// or one picked from the rail beside the desk.
type Destination = { kind: "monitor" } | { kind: "caseStudy"; caseStudy: CaseStudy };

const SHEETS = [...caseStudies, ABOUT_PAGE];
const findSheet = (slug: string | undefined) => SHEETS.find((sheet) => sheet.slug === slug);

// The on-screen desktop is laid out at this CSS size and scaled onto the
// monitor's display, which shares its 2.56:1 ultrawide ratio.
const SCREEN_PX = { w: 1536, h: 600 };
const FOV = 32;
// Idle camera, relative to the screen centre: front-right, a little above.
const IDLE_OFFSET = new THREE.Vector3(1.25, 0.45, 3.2);
const IDLE_TARGET_DROP = 0.36;
// Timed eases rather than exponential chasing: a gentle start, a gentle
// landing, and arrival exactly on the pose so the handoff needs no snap.
const ZOOM_SECONDS = 1.7;
const RETURN_SECONDS = 1.3;
// A freshly loaded case study opens its header full-bleed and settles over
// 620ms. Coming back, the monitor waits that out so it shows the page at rest.
const PAGE_SETTLE_MS = 700;
const PREPARE_TIMEOUT_MS = 4000;

// Browser window on the monitor, in screen pixels.
const WINDOW_MARGIN = 28;
const WINDOW_CHROME = 40;
const WALLPAPER = "#0b0b0b url(/desk/wallpaper.webp) center / cover no-repeat";

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// The embedded page renders at the visitor's real viewport size and is scaled
// down into the window, so when the camera zooms until the window's page area
// fills the viewport, it is the same page at the same size.
function browserLayout(viewport: Viewport) {
  const aspect = viewport.w / viewport.h;
  let contentH = SCREEN_PX.h - WINDOW_MARGIN * 2 - WINDOW_CHROME;
  let contentW = contentH * aspect;
  const maxW = SCREEN_PX.w - WINDOW_MARGIN * 2;
  if (contentW > maxW) {
    contentW = maxW;
    contentH = contentW / aspect;
  }
  const windowTop = (SCREEN_PX.h - contentH - WINDOW_CHROME) / 2;
  return {
    contentW,
    contentH,
    windowTop,
    windowLeft: (SCREEN_PX.w - contentW) / 2,
    scale: contentH / viewport.h,
    // Page-area centre below the screen centre, in screen pixels.
    offsetY: windowTop + WINDOW_CHROME + contentH / 2 - SCREEN_PX.h / 2,
  };
}
type BrowserLayout = ReturnType<typeof browserLayout>;

function idlePose(screen: ScreenPose) {
  return {
    position: screen.center.clone().add(IDLE_OFFSET),
    target: screen.center.clone().add(new THREE.Vector3(0, -IDLE_TARGET_DROP, 0)),
  };
}

function zoomPose(
  screen: ScreenPose,
  camera: THREE.PerspectiveCamera,
  variant: DeskVariant,
  layout: BrowserLayout | null
) {
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);

  if (variant === "browser" && layout) {
    const unit = screen.width / SCREEN_PX.w;
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(screen.quaternion);
    const target = screen.center.clone().addScaledVector(up, -layout.offsetY * unit);
    // Same aspect as the viewport, so fitting the height fits the width too.
    const distance = (layout.contentH * unit) / 2 / tanHalf;
    return { position: target.clone().addScaledVector(screen.normal, distance), target };
  }

  const fitHeight = screen.height / 2 / tanHalf;
  const fitWidth = screen.width / 2 / (tanHalf * camera.aspect);
  // Contain the whole display with a little bezel, or push in until it covers
  // the viewport so its colour can carry straight into the case study.
  const distance = variant === "screen"
    ? Math.max(fitHeight, fitWidth) / 0.9
    : Math.min(fitHeight, fitWidth) * 0.97;
  return {
    position: screen.center.clone().addScaledVector(screen.normal, distance),
    target: screen.center.clone(),
  };
}

type Tween = {
  phase: Phase;
  startedAt: number;
  fromOffset: THREE.Spherical;
  fromTarget: THREE.Vector3;
  done: boolean;
};

function CameraRig({
  screen,
  layout,
  phase,
  variant,
  startZoomed,
  onArrive,
  onReturned,
}: {
  screen: ScreenPose;
  layout: BrowserLayout | null;
  phase: Phase;
  variant: DeskVariant;
  startZoomed: boolean;
  onArrive: () => void;
  onReturned: () => void;
}) {
  const { camera } = useThree();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const lookAt = useRef(new THREE.Vector3());
  const tween = useRef<Tween | null>(null);
  const initialized = useRef(false);
  const previousPhase = useRef<Phase>(phase);
  const idleTarget = idlePose(screen).target;

  useFrame(({ clock }) => {
    const cam = camera as THREE.PerspectiveCamera;
    const idle = idlePose(screen);
    const zoom = zoomPose(screen, cam, variant, layout);

    if (!initialized.current) {
      initialized.current = true;
      const start = startZoomed ? zoom : idle;
      cam.position.copy(start.position);
      lookAt.current.copy(start.target);
      cam.lookAt(lookAt.current);
    }

    // Handing back to the orbit controls: they pick up from wherever the
    // return ease left the camera, looking at the same point.
    if (phase === "idle" && previousPhase.current !== "idle" && controls.current) {
      controls.current.target.copy(idle.target);
      controls.current.update();
    }
    previousPhase.current = phase;

    if (phase !== "zooming" && phase !== "returning") return;

    // Swing round the zoom target in spherical coordinates rather than along
    // a straight line, so a zoom started behind the desk arcs round the
    // monitor instead of passing through it.
    const pivot = zoom.target;
    if (!tween.current || tween.current.phase !== phase) {
      tween.current = {
        phase,
        startedAt: clock.elapsedTime,
        fromOffset: new THREE.Spherical().setFromVector3(cam.position.clone().sub(pivot)),
        fromTarget: lookAt.current.clone(),
        done: false,
      };
    }
    if (tween.current.done) return;

    const goal = phase === "zooming" ? zoom : idle;
    const seconds = phase === "zooming" ? ZOOM_SECONDS : RETURN_SECONDS;
    const t = Math.min(1, (clock.elapsedTime - tween.current.startedAt) / seconds);
    const e = easeInOutCubic(t);
    const from = tween.current.fromOffset;
    const to = new THREE.Spherical().setFromVector3(goal.position.clone().sub(pivot));
    const turn = Math.atan2(Math.sin(to.theta - from.theta), Math.cos(to.theta - from.theta));
    cam.position.copy(pivot).add(new THREE.Vector3().setFromSphericalCoords(
      THREE.MathUtils.lerp(from.radius, to.radius, e),
      THREE.MathUtils.lerp(from.phi, to.phi, e),
      from.theta + turn * e
    ));
    lookAt.current.lerpVectors(tween.current.fromTarget, goal.target, e);
    cam.lookAt(lookAt.current);

    if (t >= 1) {
      tween.current.done = true;
      if (phase === "zooming") onArrive();
      else onReturned();
    }
  });

  return (
    <OrbitControls
      ref={controls}
      enabled={phase === "idle"}
      target={idleTarget}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.6}
      minDistance={1.6}
      maxDistance={5.5}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI / 2 - 0.08}
    />
  );
}

function CaseStudyCard({ caseStudy }: { caseStudy: CaseStudy }) {
  return (
    <span
      className="absolute inset-0 flex flex-col justify-between p-14 text-left text-ink"
      style={{ backgroundColor: caseStudy.thumbnailColor }}
    >
      <span className="font-body text-3xl font-medium">Case study</span>
      <span>
        <span className="block font-display text-[10rem] leading-[0.85]">{caseStudy.title}</span>
        <span className="mt-10 block max-w-[60rem] font-body text-4xl font-medium">{caseStudy.blurb}</span>
      </span>
    </span>
  );
}

function BrowserWindow({
  layout,
  viewport,
  caseStudy,
  mountPage,
  onPageLoad,
}: {
  layout: BrowserLayout;
  viewport: Viewport;
  caseStudy: CaseStudy;
  mountPage: boolean;
  onPageLoad: () => void;
}) {
  return (
    <div className="absolute inset-0" style={{ background: WALLPAPER }}>
      <div
        className="absolute overflow-hidden rounded-xl bg-cream shadow-2xl"
        style={{
          left: layout.windowLeft,
          top: layout.windowTop,
          width: layout.contentW,
          height: layout.contentH + WINDOW_CHROME,
        }}
      >
        <div
          className="flex items-center gap-4 border-b border-ink/10 bg-[#ece4dc] px-4 font-body text-base font-medium text-ink/70"
          style={{ height: WINDOW_CHROME }}
        >
          <span className="flex gap-2">
            {["#ef817a", "#eac66c", "#8aca9d"].map((color) => (
              <span key={color} className="size-3 rounded-full" style={{ backgroundColor: color }} />
            ))}
          </span>
          <span className="flex-1 truncate rounded-md bg-cream px-3 py-1 text-center">
            adrianklisz.com{caseStudyRoute(caseStudy)}
          </span>
        </div>
        <div className="relative overflow-hidden" style={{ width: layout.contentW, height: layout.contentH }}>
          {/* Live but untouchable: any tap on the monitor starts the zoom. */}
          {mountPage && (
            <iframe
              key={caseStudy.slug}
              src={caseStudyRoute(caseStudy)}
              title={caseStudy.title}
              tabIndex={-1}
              onLoad={onPageLoad}
              className="pointer-events-none absolute top-0 left-0 border-0 bg-cream"
              style={{
                width: viewport.w,
                height: viewport.h,
                transform: `scale(${layout.scale})`,
                transformOrigin: "0 0",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ScreenSurface({
  screen,
  caseStudy,
  layout,
  viewport,
  phase,
  variant,
  mountBrowserPage,
  onPageLoad,
  onOpen,
}: {
  screen: ScreenPose;
  caseStudy: CaseStudy;
  layout: BrowserLayout | null;
  viewport: Viewport;
  phase: Phase;
  variant: DeskVariant;
  mountBrowserPage: boolean;
  onPageLoad: () => void;
  onOpen: () => void;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const distanceFactor = (400 * screen.width) / SCREEN_PX.w;
  // Load the real page while the camera travels, reveal it on arrival.
  const mountPage = variant === "screen" && phase !== "idle";
  const showPage = variant === "screen" && phase === "focused";

  // HTML always draws over the canvas, so hide the screen once the orbit
  // carries the camera behind the monitor.
  useFrame(({ camera }) => {
    const el = surface.current;
    if (!el) return;
    const facing = camera.position.clone().sub(screen.center).dot(screen.normal) > 0.02;
    el.style.visibility = facing ? "visible" : "hidden";
  });

  return (
    <group position={screen.center} quaternion={screen.quaternion}>
      <Html transform distanceFactor={distanceFactor} position={[0, 0, 0.001]} zIndexRange={[20, 0]}>
        <div
          ref={surface}
          className="relative overflow-hidden bg-cream"
          style={{ width: SCREEN_PX.w, height: SCREEN_PX.h }}
        >
          {variant === "browser" && layout ? (
            <BrowserWindow
              layout={layout}
              viewport={viewport}
              caseStudy={caseStudy}
              mountPage={mountBrowserPage}
              onPageLoad={onPageLoad}
            />
          ) : (
            <>
              {mountPage && (
                <iframe
                  src={caseStudyRoute(caseStudy)}
                  title={caseStudy.title}
                  className="absolute inset-0 size-full border-0 bg-cream"
                />
              )}
              <span
                className="absolute inset-0 transition-opacity duration-500"
                style={{ opacity: showPage ? 0 : 1 }}
              >
                <CaseStudyCard caseStudy={caseStudy} />
              </span>
            </>
          )}
          <button
            type="button"
            onClick={onOpen}
            disabled={phase !== "idle"}
            aria-label={`Open ${caseStudy.title}`}
            className="absolute inset-0 cursor-pointer"
            style={{ pointerEvents: showPage ? "none" : undefined }}
          />
        </div>
      </Html>
    </group>
  );
}

const HINTS: Record<DeskVariant, string> = {
  screen: "Click the screen to open the case study · drag to look around",
  zoom: "Click the screen to open the case study · drag to look around",
  browser: "Tap the screen to step inside · drag to look around",
};

export function DeskStage({ variant, active = true }: { variant: DeskVariant; active?: boolean }) {
  const router = useRouter();
  const [screen, setScreen] = useState<ScreenPose | null>(null);
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
    setCaseStudy(returning ?? caseStudies[Math.floor(Math.random() * caseStudies.length)]);
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

  useEffect(() => {
    if (variant !== "screen" || phase !== "focused") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") leave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant, phase, leave]);

  const zoomTo = useCallback((next: Destination) => {
    setDestination(next);
    setPhase("zooming");
  }, []);

  const arrive = useCallback(() => {
    setPhase("focused");
    if (variant === "browser" && destination.kind === "monitor" && caseStudy) {
      setArrivingFromDesk();
      router.push(caseStudyRoute(caseStudy));
    }
  }, [variant, destination, caseStudy, router]);

  const ready = screen !== null && caseStudy !== null && viewport !== null;
  const layout = viewport && variant === "browser" ? browserLayout(viewport) : null;
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
      style={{ opacity: active ? 1 : 0, zIndex: active ? undefined : -1 }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        frameloop={active ? "always" : "never"}
        gl={{ antialias: true, alpha: true }}
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
        <ambientLight intensity={0.8} color="#fff6ee" />
        <hemisphereLight args={["#fffaf4", "#e9dccf", 0.4]} />
        <directionalLight
          position={[2.4, 4.6, 3.2]}
          intensity={1.7}
          color="#fff1e2"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0002}
          shadow-camera-left={-3}
          shadow-camera-right={3}
          shadow-camera-top={3}
          shadow-camera-bottom={-3}
        />
        <Suspense fallback={null}>
          <DeskModel onScreen={setScreen} />
        </Suspense>
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[12, 12]} />
          <shadowMaterial opacity={0.14} />
        </mesh>
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
              onPageLoad={onPageLoad}
              onOpen={() => zoomTo({ kind: "monitor" })}
            />
            <CameraRig
              screen={screen}
              layout={layout}
              phase={phase}
              variant={variant}
              startZoomed={startZoomed}
              onArrive={arrive}
              onReturned={() => setPhase("idle")}
            />
          </>
        )}
      </Canvas>

      {!ready && (
        <p className="pointer-events-none absolute inset-0 grid place-items-center font-body text-lg font-medium">
          Setting up the desk…
        </p>
      )}

      {/* textfolio's own rail, beside the desk. PageIndicator offsets itself
          for Home's overscanned hero sheet, so give it a frame shifted by the
          same overscan. */}
      {variant === "browser" && ready && (
        <div
          className="pointer-events-none absolute inset-y-0 transition-opacity duration-300"
          style={{
            left: `-${SHEET_OVERSCAN_PERCENT}vw`,
            width: "100vw",
            opacity: phase === "idle" ? 1 : 0,
            visibility: phase === "idle" ? "visible" : "hidden",
          }}
        >
          <PageIndicator
            caseStudies={SHEETS}
            onSelect={(picked) => zoomTo({ kind: "caseStudy", caseStudy: picked })}
          />
        </div>
      )}

      {ready && phase === "idle" && (
        <p className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center">
          <span className="rounded-full bg-cream/90 px-4 py-2 font-body text-base font-medium">
            {HINTS[variant]}
          </span>
        </p>
      )}

      {variant === "screen" && phase === "focused" && (
        <button
          type="button"
          onClick={leave}
          className="absolute top-6 right-6 z-30 cursor-pointer rounded-full bg-ink px-5 py-3 font-body text-base font-medium text-cream"
        >
          Back to desk
        </button>
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
