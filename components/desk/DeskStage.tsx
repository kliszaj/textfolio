"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentRef } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { CaseStudyFocus } from "@/components/CaseStudyFocus";
import { CircularText } from "@/components/CircularText";
import { PageIndicator } from "@/components/PageIndicator";
import { caseStudies, caseStudyRoute } from "@/data/caseStudies";
import type { CaseStudy } from "@/data/caseStudies";
import { ABOUT_PAGE } from "@/data/about";
import { DEFAULT_FOCUS_VARIANT_ID } from "@/lib/focusVariants";
import { DeskClock, useDeskTime } from "./DeskClock";
import { BrowserChrome } from "./BrowserChrome";
import { DesktopWindows } from "./DesktopWindows";
import { sceneForHour, type WorkspaceScene } from "@/lib/workspace/scenes";
import { gradientCSS, useDeskGradients } from "./DeskGradients";
import { useDeskTwilight } from "./DeskTwilight";
import { useDuskSky, windowLightStrength } from "./DuskSky";
import { DeskFramingControls, useDeskFraming, useDeskColors, type DeskFraming } from "./DeskFraming";
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
// Changing the time of day swaps the case study on the monitor last, once the
// clock, furniture and light have settled.
const SCREEN_SWAP_DELAY_MS = 1300;
const PAGE_FADE_OUT_MS = 220;
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

// Browser window on the monitor, in screen pixels.
const WINDOW_MARGIN = 28;
const WINDOW_CHROME = 72;
const WALLPAPER = "#0b0b0b url(/desk/wallpaper.webp) center / cover no-repeat";

// Text over the stage background is plain ink or cream, never blended.
const INK = "#1c1c1c";
const CREAM = "#F5EDE6";
// WCAG relative luminance; three.js keeps colour components linear.
const luminance = (color: THREE.Color) => 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
const INK_LUMINANCE = luminance(new THREE.Color(INK));
const CREAM_LUMINANCE = luminance(new THREE.Color(CREAM));

const FLOOR_SHADOW_OPACITY = 0.3;
// Sun-plus-sky intensity at which the floor shadow reaches full strength.
const FLOOR_SHADOW_FULL_AT = 1.2;
const NEUTRAL_SHADOW = "#000000";
const TWILIGHT_SHADOW = "#5a3cc8";
// At night the screen throws a soft cone forwards and down over the desk and
// chair; a weak point light just fills around the panel.
const MONITOR_NIGHT_SPOT = 2.4;
const MONITOR_NIGHT_FILL = 0.2;
// How much of the glass's sheen goes when the room is dark.
const GLARE_NIGHT_DIM = 0.7;

function DeskLighting({ solar, screen }: { solar: ReturnType<typeof useDeskTime>["solar"]; screen: ScreenPose | null }) {
  const ambient = useRef<THREE.AmbientLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.HemisphereLight>(null);
  const monitor = useRef<THREE.PointLight>(null);
  const monitorSpot = useRef<THREE.SpotLight>(null);
  const [spotTarget] = useState(() => new THREE.Object3D());
  const rim = useRef<THREE.DirectionalLight>(null);
  const floor = useRef<THREE.ShadowMaterial>(null);
  const darkness = solar?.darkness ?? 0;
  const sunlight = useMemo(() => {
    const directIntensity = solar?.sunIntensity ?? 1.7;
    const windowIntensity = (solar?.daylight ?? 1) * 0.55;
    const directWeight = directIntensity / Math.max(0.001, directIntensity + windowIntensity);
    // Approximate diffuse sky entering the NE window with the same shadow
    // source as the sun, so daylight still grounds the desk without doubling
    // shadows. Direct sun gradually takes over its direction when admitted.
    const sunPosition = new THREE.Vector3(...(solar?.sunPosition ?? [0, 8, 0] as [number, number, number]));
    // Let the dominant sky light travel across the window as the sun moves,
    // even when the sun itself is outside the window's direct view.
    const windowPosition = new THREE.Vector3(
      sunPosition.x * 0.7,
      2.8 + Math.max(0, sunPosition.y) * 0.7,
      7,
    );
    return {
      position: windowPosition.lerp(sunPosition, directWeight),
      color: new THREE.Color("#fff6ee").lerp(new THREE.Color("#ffd1a1"), (solar?.warmSun ?? 0) * directWeight),
      ambientColor: new THREE.Color("#fff6ee").lerp(new THREE.Color("#3A3A5A"), darkness),
      skyColor: new THREE.Color("#fffaf4").lerp(new THREE.Color("#6C63FF"), darkness),
      groundColor: new THREE.Color("#e9dccf").lerp(new THREE.Color("#181828"), darkness),
      intensity: directIntensity + windowIntensity,
      shadowRadius: THREE.MathUtils.lerp(6, 2, directWeight),
      // The low evening sun throws a long, soft floor shadow across the
      // bottom of the frame; tint it with the night's purple as dusk comes on.
      floorShadow: new THREE.Color(NEUTRAL_SHADOW).lerp(new THREE.Color(TWILIGHT_SHADOW), solar && !solar.morning ? solar.horizonMix : 0),
    };
  }, [solar, darkness]);
  useFrame((_, delta) => {
    const blend = 1 - Math.exp(-delta * 3);
    if (ambient.current) {
      ambient.current.intensity = THREE.MathUtils.lerp(ambient.current.intensity, THREE.MathUtils.lerp(0.45, 0.3, darkness), blend);
      ambient.current.color.lerp(sunlight.ambientColor, blend);
    }
    if (key.current) {
      key.current.intensity = THREE.MathUtils.lerp(key.current.intensity, sunlight.intensity, blend);
      key.current.position.lerp(sunlight.position, blend);
      key.current.color.lerp(sunlight.color, blend);
      key.current.shadow.radius = THREE.MathUtils.lerp(key.current.shadow.radius, sunlight.shadowRadius, blend);
    }
    if (fill.current) {
      fill.current.intensity = THREE.MathUtils.lerp(fill.current.intensity, THREE.MathUtils.lerp(0.5, 0.35, darkness), blend);
      fill.current.color.lerp(sunlight.skyColor, blend);
      fill.current.groundColor.lerp(sunlight.groundColor, blend);
    }
    // At night the monitor is the main light, washing the desk in front of it.
    if (monitorSpot.current) monitorSpot.current.intensity = THREE.MathUtils.lerp(monitorSpot.current.intensity, darkness * MONITOR_NIGHT_SPOT, blend);
    if (monitor.current) monitor.current.intensity = THREE.MathUtils.lerp(monitor.current.intensity, 0.02 + darkness * MONITOR_NIGHT_FILL, blend);
    if (rim.current) rim.current.intensity = THREE.MathUtils.lerp(rim.current.intensity, darkness * 0.4, blend);
    // ShadowMaterial draws the shadow map at full strength however dim its
    // light is, so fade the floor shadow with the sun, and only stop casting
    // once it has faded out -- otherwise it holds, then vanishes at dusk.
    const sun = key.current?.intensity ?? 0;
    const floorOpacity = FLOOR_SHADOW_OPACITY * THREE.MathUtils.smoothstep(sun, 0.02, FLOOR_SHADOW_FULL_AT);
    if (floor.current) {
      floor.current.opacity = floorOpacity;
      floor.current.color.lerp(sunlight.floorShadow, blend);
    }
    if (key.current) key.current.castShadow = floorOpacity > 0.002;
  });
  return <>
    <ambientLight ref={ambient} intensity={0.8} color="#fff6ee" />
    <hemisphereLight ref={fill} args={["#fffaf4", "#e9dccf", 0.4]} />
    <directionalLight ref={key} position={[2.4, 4.6, 3.2]} intensity={1.7} color="#fff1e2" castShadow
      shadow-mapSize={[2048, 2048]} shadow-bias={-0.0002} shadow-camera-far={25}
      shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-3} />
    <directionalLight ref={rim} position={[-2, 2.5, -2.5]} intensity={0} color="#9fb0e0" />
    {screen && <>
      {/* The screen's light goes forwards, not all round: a wide soft cone
          from the panel, aimed down over the desk at the chair. */}
      <primitive object={spotTarget} position={screen.center.clone().addScaledVector(screen.normal, 0.9).add(new THREE.Vector3(0, -0.6, 0))} />
      <spotLight ref={monitorSpot} target={spotTarget} position={screen.center.clone().addScaledVector(screen.normal, 0.04)} color="#aacdff" intensity={0} angle={1.05} penumbra={1} distance={3} decay={2} />
      <pointLight ref={monitor} position={screen.center.clone().addScaledVector(screen.normal, 0.08)} color="#aacdff" intensity={0} distance={0.8} decay={2} />
    </>}
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[12, 12]} />
      <shadowMaterial ref={floor} opacity={FLOOR_SHADOW_OPACITY} />
    </mesh>
  </>;
}

// The last sun through the window, falling on the wall behind the desk in the
// Window light twilight style. A soft four-pane patch in the scene rather than
// on the backdrop, so it turns with the room when the desk is orbited. It
// slides down, stretches and fades as the sun sets.
const WINDOW_LIGHT_AT = { x: 0.75, z: -0.5 };
const WINDOW_LIGHT_OPACITY = 0.55;

function WindowLight({ solar, glow, enabled }: { solar: ReturnType<typeof useDeskTime>["solar"]; glow: string; enabled: boolean }) {
  const patch = useRef<THREE.Mesh>(null);
  const material = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.filter = "blur(16px)";
    ctx.fillStyle = "#ffffff";
    // Four panes thrown long and slanting across the wall.
    ctx.setTransform(1, 0.1, -0.45, 1, 210, 60);
    for (const [x, y] of [[0, 0], [150, 0], [0, 190], [150, 190]]) ctx.fillRect(x, y, 135, 175);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, opacity: 0, toneMapped: false });
  }, []);
  useEffect(() => () => {
    material.map?.dispose();
    material.dispose();
  }, [material]);
  const tint = useMemo(() => new THREE.Color("#ffffff").lerp(new THREE.Color(glow), 0.5), [glow]);

  useFrame(({ camera }, delta) => {
    const mesh = patch.current;
    if (!mesh) return;
    const horizon = solar?.horizonMix ?? 0;
    const evening = !(solar?.morning ?? true);
    const d = THREE.MathUtils.smoothstep(horizon, 0.35, 1);
    // The wall itself isn't drawn, so fade the light as the orbit turns to
    // see it edge-on rather than leave a floating sliver.
    const toCamera = camera.position.clone().sub(mesh.position).normalize();
    const facing = THREE.MathUtils.smoothstep(toCamera.z, 0.25, 0.7);
    const target = enabled && evening ? windowLightStrength(horizon, solar?.backgroundNightMix ?? 0) * WINDOW_LIGHT_OPACITY * facing : 0;
    const blend = 1 - Math.exp(-delta * 3);
    const light = mesh.material as THREE.MeshBasicMaterial;
    light.opacity = THREE.MathUtils.lerp(light.opacity, target, blend);
    light.color.lerp(tint, blend);
    mesh.visible = light.opacity > 0.003;
    mesh.position.set(WINDOW_LIGHT_AT.x - 0.25 * d, THREE.MathUtils.lerp(1.5, 1.1, d), WINDOW_LIGHT_AT.z);
    mesh.scale.set(1 + 0.15 * d, 1 + 0.35 * d, 1);
  });

  return (
    <mesh ref={patch} material={material} renderOrder={-1}>
      <planeGeometry args={[1.1, 1.1]} />
    </mesh>
  );
}

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

function idlePose(screen: ScreenPose, framing: DeskFraming, aspect: number) {
  const offset = IDLE_OFFSET.clone().divideScalar(framing.zoom);
  const right = new THREE.Vector3().crossVectors(offset, new THREE.Vector3(0, 1, 0)).normalize().negate();
  const up = new THREE.Vector3().crossVectors(offset, right).normalize();
  const height = 2 * offset.length() * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const shift = right.multiplyScalar(-framing.x / 100 * height * aspect).addScaledVector(up, -framing.y / 100 * height);
  return {
    position: screen.center.clone().add(offset).add(shift),
    target: screen.center.clone().add(new THREE.Vector3(0, -IDLE_TARGET_DROP, 0)).add(shift),
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
  framing,
  screen,
  layout,
  phase,
  variant,
  startZoomed,
  onArrive,
  onReturned,
}: {
  framing: DeskFraming;
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
  const previousFraming = useRef(framing);
  const aspect = useThree((state) => state.size.width / state.size.height);
  const idleTarget = useMemo(() => idlePose(screen, framing, aspect).target, [screen, framing, aspect]);

  useFrame(({ clock }) => {
    const cam = camera as THREE.PerspectiveCamera;
    const idle = idlePose(screen, framing, cam.aspect);
    const zoom = zoomPose(screen, cam, variant, layout);

    if (!initialized.current) {
      initialized.current = true;
      const start = startZoomed ? zoom : idle;
      cam.position.copy(start.position);
      lookAt.current.copy(start.target);
      cam.lookAt(lookAt.current);
    }

    if (phase === "idle" && previousFraming.current !== framing) {
      cam.position.copy(idle.position);
      lookAt.current.copy(idle.target);
      controls.current?.target.copy(idle.target);
      controls.current?.update();
      cam.lookAt(idle.target);
    }
    previousFraming.current = framing;

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
    // Apparent size goes with 1 / distance, so a linear distance crams most
    // of the visible zoom into the last frames and the page seems to slam
    // in. Interpolating by ratio makes the growth even, so the ease's gentle
    // landing actually reads as one.
    const radius = from.radius * Math.pow(to.radius / from.radius, e);
    cam.position.copy(pivot).add(new THREE.Vector3().setFromSphericalCoords(
      radius,
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
      // The wheel steps through the times of day instead.
      enableZoom={false}
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
  scene,
  onPageLoad,
}: {
  layout: BrowserLayout;
  viewport: Viewport;
  caseStudy: CaseStudy;
  mountPage: boolean;
  scene: WorkspaceScene;
  onPageLoad: () => void;
}) {
  // What the window is showing. A new case study plays as a navigation: the
  // old page fades out, the address bar changes, the new one rises in once loaded.
  const [page, setPage] = useState(caseStudy);
  const [pageState, setPageState] = useState<"loading" | "shown" | "leaving">("loading");
  useEffect(() => {
    if (caseStudy.slug === page.slug) return;
    const leave = window.setTimeout(() => setPageState("leaving"), 0);
    const swap = window.setTimeout(() => {
      setPage(caseStudy);
      setPageState("loading");
    }, PAGE_FADE_OUT_MS);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(swap);
    };
  }, [caseStudy, page]);
  const shown = pageState === "shown";

  return (
    <div className="absolute inset-0" style={{ background: WALLPAPER }}>
      <DesktopWindows scene={scene} />
      <div
        className="absolute overflow-hidden rounded-xl bg-cream shadow-2xl"
        style={{
          left: layout.windowLeft,
          top: layout.windowTop,
          width: layout.contentW,
          height: layout.contentH + WINDOW_CHROME,
        }}
      >
        <BrowserChrome caseStudy={page} />
        <div
          className="relative overflow-hidden"
          style={{
            width: layout.contentW,
            height: layout.contentH,
            opacity: shown ? 1 : 0,
            transform: shown ? "none" : "translateY(14px)",
            transition: shown
              ? "opacity 450ms ease-out, transform 550ms cubic-bezier(0.22, 1, 0.36, 1)"
              : `opacity ${PAGE_FADE_OUT_MS}ms ease-in`,
          }}
        >
          {/* Live but untouchable: any tap on the monitor starts the zoom. */}
          {mountPage && (
            <iframe
              key={page.slug}
              src={caseStudyRoute(page)}
              title={page.title}
              tabIndex={-1}
              onLoad={() => {
                setPageState("shown");
                onPageLoad();
              }}
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
  scene,
  darkness,
  onPageLoad,
  onOpen,
}: {
  darkness: number;
  screen: ScreenPose;
  caseStudy: CaseStudy;
  layout: BrowserLayout | null;
  viewport: Viewport;
  phase: Phase;
  variant: DeskVariant;
  mountBrowserPage: boolean;
  scene: WorkspaceScene;
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
              scene={scene}
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
          {/* A faint diagonal sheen of room light on the glass, weaker at
              night. Gone before a zoom lands, so the hand-off stays exact. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: "linear-gradient(115deg, transparent 28%, rgba(255, 255, 255, 0.07) 42%, rgba(255, 255, 255, 0.02) 52%, transparent 62%)",
              opacity: phase === "idle" ? 1 - darkness * GLARE_NIGHT_DIM : 0,
              transition: "opacity 400ms ease",
            }}
          />
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

export function DeskStage({ variant, active = true }: { variant: DeskVariant; active?: boolean }) {
  const router = useRouter();
  const [screen, setScreen] = useState<ScreenPose | null>(null);
  const clock = useDeskTime();
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
  const wheelTravel = useRef(0);
  const wheelLockedUntil = useRef(0);
  const onWheel = (event: React.WheelEvent) => {
    if (!active || phase !== "idle") return;
    if (event.target instanceof Element && event.target.closest("[data-desk-settings]")) return;
    const now = performance.now();
    if (now < wheelLockedUntil.current) {
      wheelTravel.current = 0;
      wheelLockedUntil.current = Math.max(wheelLockedUntil.current, now + WHEEL_GESTURE_GAP_MS);
      return;
    }
    wheelTravel.current += event.deltaY * (event.deltaMode === 1 ? 16 : 1);
    if (Math.abs(wheelTravel.current) < WHEEL_STEP_PX) return;
    stepTime(wheelTravel.current > 0 ? 1 : -1);
    wheelTravel.current = 0;
    wheelLockedUntil.current = now + WHEEL_STEP_LOCK_MS;
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
  // Once only: coming back from a case study, the UI is simply there.
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!ready || revealed) return;
    const timer = window.setTimeout(() => setRevealed(true), UI_REVEAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [ready, revealed]);
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
        <DeskLighting solar={clock.solar} screen={screen} />
        <WindowLight solar={clock.solar} glow={twilight.glow} enabled={twilight.style === "window"} />
        <Suspense fallback={null}>
          <DeskModel onScreen={setScreen} hour={clock.sceneHour} darkness={clock.solar?.darkness ?? 0} />
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
              onOpen={() => zoomTo({ kind: "monitor" })}
            />
            <CameraRig
              framing={framing}
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
        <CircularText text="LOADING*LOADING*" spinDuration={8} />
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
          <DeskClock clock={clock} />
        </div>
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
