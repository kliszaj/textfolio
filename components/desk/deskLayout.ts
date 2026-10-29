import * as THREE from "three";
import { caseStudies } from "@/data/caseStudies";
import type { CaseStudy } from "@/data/caseStudies";
import { ABOUT_PAGE } from "@/data/about";
import type { DeskFraming } from "./DeskFraming";
import type { ScreenPose } from "./DeskModel";

// Shared shapes and the pure geometry of the desk: where the browser window
// sits on the monitor, and where the camera rests and zooms to.

// "screen": the case study opens on the monitor itself (Henry-style).
// "zoom": the camera pushes through the monitor into the real case study page.
// "browser": the monitor runs a case study in a browser window; a tap zooms
// through it into the real page, and its Home icon zooms back out.
export type DeskVariant = "screen" | "zoom" | "browser";
export type Phase = "idle" | "zooming" | "focused" | "returning";
export type Viewport = { w: number; h: number };
// Where a zoom into the browser window ends: the case study on the monitor,
// or one picked from the rail beside the desk.
export type Destination = { kind: "monitor" } | { kind: "caseStudy"; caseStudy: CaseStudy } | { kind: "typing" };

export const SHEETS = [...caseStudies, ABOUT_PAGE];
export const findSheet = (slug: string | undefined) => SHEETS.find((sheet) => sheet.slug === slug);

// The on-screen desktop is laid out at this CSS size and scaled onto the
// monitor's display, which shares its 2.56:1 ultrawide ratio.
export const SCREEN_PX = { w: 1536, h: 600 };
export const FOV = 32;
// Idle camera, relative to the screen centre: front-right, a little above.
export const IDLE_OFFSET = new THREE.Vector3(1.25, 0.45, 3.2);
export const IDLE_TARGET_DROP = 0.36;

// Browser window on the monitor, in screen pixels.
export const WINDOW_MARGIN = 28;
export const WINDOW_CHROME = 72;

// The embedded page renders at the visitor's real viewport size and is scaled
// down into the window, so when the camera zooms until the window's page area
// fills the viewport, it is the same page at the same size.
export function browserLayout(viewport: Viewport) {
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
export type BrowserLayout = ReturnType<typeof browserLayout>;

// The vertical field of view is fixed, so a narrow viewport sees a narrow
// slice of the desk. Below this aspect the camera backs off to keep the desk's
// width in frame -- most of the way, since a portrait phone also has height
// to spare below and above it.
const FIT_WIDTH_BELOW_ASPECT = 1.3;
const FIT_WIDTH_STRENGTH = 0.85;

export function idlePose(screen: ScreenPose, framing: DeskFraming, aspect: number) {
  const narrow = Math.pow(Math.max(1, FIT_WIDTH_BELOW_ASPECT / aspect), FIT_WIDTH_STRENGTH);
  const offset = IDLE_OFFSET.clone().divideScalar(framing.zoom).multiplyScalar(narrow);
  const right = new THREE.Vector3().crossVectors(offset, new THREE.Vector3(0, 1, 0)).normalize().negate();
  const up = new THREE.Vector3().crossVectors(offset, right).normalize();
  const height = 2 * offset.length() * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const shift = right.multiplyScalar(-framing.x / 100 * height * aspect).addScaledVector(up, -framing.y / 100 * height);
  return {
    position: screen.center.clone().add(offset).add(shift),
    target: screen.center.clone().add(new THREE.Vector3(0, -IDLE_TARGET_DROP, 0)).add(shift),
  };
}

export function zoomPose(
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

// The typing test (click the keyboard) opens as an app window over the
// browser window, the same size, and the camera zooms until the whole window
// fills this share of the viewport -- a little wallpaper still showing round
// it, unlike a case study, which fills the screen.
export const TYPING_FIT = 0.86;

export function typingWindow(layout: BrowserLayout, viewport: Viewport) {
  const width = layout.contentW;
  const height = layout.contentH + WINDOW_CHROME;
  // How much bigger the window is on screen once the zoom lands.
  const scale = TYPING_FIT * Math.min(viewport.w / width, viewport.h / height);
  return {
    // On the monitor, in its pixels.
    left: layout.windowLeft,
    top: layout.windowTop,
    width,
    height,
    scale,
    // Where it lands in the viewport: centred, at that scale.
    overlayLeft: (viewport.w - width * scale) / 2,
    overlayTop: (viewport.h - height * scale) / 2,
  };
}

export function typingPose(screen: ScreenPose, camera: THREE.PerspectiveCamera, layout: BrowserLayout, viewport: Viewport) {
  const box = typingWindow(layout, viewport);
  const unit = screen.width / SCREEN_PX.w;
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(screen.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(screen.quaternion);
  const target = screen.center.clone()
    .addScaledVector(right, (box.left + box.width / 2 - SCREEN_PX.w / 2) * unit)
    .addScaledVector(up, -(box.top + box.height / 2 - SCREEN_PX.h / 2) * unit);
  // One monitor pixel is `unit` in the world and `scale` pixels on screen, so
  // the viewport's height spans viewport.h / scale monitor pixels.
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const distance = ((viewport.h / box.scale) * unit) / 2 / tanHalf;
  return { position: target.clone().addScaledVector(screen.normal, distance), target };
}
