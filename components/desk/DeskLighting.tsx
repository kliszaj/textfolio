"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { useDeskTime } from "./DeskClock";
import type { ScreenPose } from "./DeskModel";
import { morningLightStrength, windowLightStrength } from "./DuskSky";
import { roomIsDark, windowLit } from "@/lib/deskDaylight";
import { MAX_FRAME_DELTA, useRenderAfterChange } from "./renderOnDemand";

const FLOOR_SHADOW_OPACITY = 0.3;
// Sun-plus-sky intensity at which the floor shadow reaches full strength.
const FLOOR_SHADOW_FULL_AT = 1.2;
const NEUTRAL_SHADOW = "#000000";
const TWILIGHT_SHADOW = "#5a3cc8";
// The lights ease towards a new time of day at this rate; frames keep coming
// for long enough after a change to see them settle.
const LIGHT_EASE_RATE = 3;
const LIGHT_SETTLE_SECONDS = 2.5;

// At night the screen throws a soft cone forwards and down over the desk and
// chair; a weak point light just fills around the panel.
const MONITOR_NIGHT_SPOT = 2.4;
const MONITOR_NIGHT_FILL = 0.2;
// The day's colours: the sun a near-neutral white (about 5500K), the room's
// ambient and sky fill a faint blue (skylight, about 7000K).
const DAY_SUN = "#fff9f2";
const DAY_AMBIENT = "#f0f3ff";
const DAY_SKY = "#e6ecff";

export function DeskLighting({ solar, screen, windowEnabled }: { solar: ReturnType<typeof useDeskTime>["solar"]; screen: ScreenPose | null; windowEnabled: boolean }) {
  const ambient = useRef<THREE.AmbientLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.HemisphereLight>(null);
  const monitor = useRef<THREE.PointLight>(null);
  const monitorSpot = useRef<THREE.SpotLight>(null);
  const [spotTarget] = useState(() => new THREE.Object3D());
  const rim = useRef<THREE.DirectionalLight>(null);
  const floor = useRef<THREE.ShadowMaterial>(null);
  const darkness = solar?.darkness ?? 0;
  // One main light at a time: as the window light comes in (WindowLight),
  // the room's sun hands over to it -- fading out, and leaving the shadows on
  // the furniture to the window. The floor's shadow goes with the sun: from
  // a window that low behind the viewer it would be a huge, stray shape.
  const windowShare = windowLightShare(solar, windowEnabled);
  const handOver = useRef(windowShare);
  const sunCasting = useRef<boolean | null>(null);
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
    // In the day (the sun the room's light, high and white) the sky that
    // fills the room reads cool: the ambient and the sky fill lean blue, so
    // the shadows do. Not with the window lit (morning, sunset: warm) and
    // less the lower the sun, so golden hour stays golden.
    const cool = windowShare ? 0 : (1 - (solar?.warmSun ?? 0)) * (1 - darkness);
    return {
      position: windowPosition.lerp(sunPosition, directWeight),
      color: new THREE.Color("#fff6ee").lerp(new THREE.Color("#ffd1a1"), (solar?.warmSun ?? 0) * directWeight).lerp(new THREE.Color(DAY_SUN), cool),
      ambientColor: new THREE.Color("#fff6ee").lerp(new THREE.Color(DAY_AMBIENT), cool).lerp(new THREE.Color("#3A3A5A"), darkness),
      skyColor: new THREE.Color("#fffaf4").lerp(new THREE.Color(DAY_SKY), cool).lerp(new THREE.Color("#6C63FF"), darkness),
      groundColor: new THREE.Color("#e9dccf").lerp(new THREE.Color("#181828"), darkness),
      intensity: directIntensity + windowIntensity,
      shadowRadius: THREE.MathUtils.lerp(6, 2, directWeight),
      // The low evening sun throws a long, soft floor shadow across the
      // bottom of the frame; tint it with the night's purple as dusk comes on.
      floorShadow: new THREE.Color(NEUTRAL_SHADOW).lerp(new THREE.Color(TWILIGHT_SHADOW), solar && !solar.morning ? solar.horizonMix : 0),
    };
  }, [solar, darkness, windowShare]);
  useRenderAfterChange(LIGHT_SETTLE_SECONDS, [sunlight, darkness, screen, windowShare], { shadows: true });
  useFrame(({ gl, invalidate }, delta) => {
    const blend = 1 - Math.exp(-Math.min(delta, MAX_FRAME_DELTA) * LIGHT_EASE_RATE);
    // At the window light's own pace, so the two cross over together. That
    // can outlast the frames a change asks for, so keep asking until it's
    // done: the sun's shadow comes back at the very end of it.
    handOver.current = THREE.MathUtils.lerp(handOver.current, windowShare, 1 - Math.exp(-Math.min(delta, MAX_FRAME_DELTA) * PATCH_FADE_RATE));
    if (Math.abs(handOver.current - windowShare) > 0.001) invalidate();
    if (ambient.current) {
      ambient.current.intensity = THREE.MathUtils.lerp(ambient.current.intensity, THREE.MathUtils.lerp(0.45, 0.3, darkness), blend);
      ambient.current.color.lerp(sunlight.ambientColor, blend);
    }
    if (key.current) {
      // In the morning window the sun keeps a little light, standing along
      // the window's direction: it draws the shadows then, so they fall the
      // window's way, once (the morning window casts none of its own).
      const sunKeeps = solar?.morning ? MORNING_SUN_KEEPS : 0;
      key.current.intensity = THREE.MathUtils.lerp(key.current.intensity, sunlight.intensity * (1 - handOver.current * (1 - sunKeeps)), blend);
      // While the window has the room, the sun stands where the window is,
      // so the floor shadow it draws (below) falls the window's way.
      // Handing back, it swings from there to its own place, so its shadow
      // moves into position as it comes in rather than appearing in it.
      key.current.position.lerp(windowShare ? (solar?.morning ? MORNING_FLOOR_SUN : EVENING_FLOOR_SUN) : sunlight.position, blend);
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
    // light is, so its opacity does the fading: with the sun (none at night),
    // and across the handover to and from the window. The floor can't tell
    // one light's shadow from another's, so they take turns: the window's
    // shadows fade over the first half of a handover (WindowPatch), the
    // sun's floor shadow over the second, never both at once. In the morning
    // the desk keeps its floor shadow throughout: the sun, standing along the
    // window's light, draws all the shadows then (see sunKeeps above).
    const daylit = THREE.MathUtils.smoothstep(sunlight.intensity, 0.02, FLOOR_SHADOW_FULL_AT);
    const sunsTurn = solar?.morning ? 1 : 1 - THREE.MathUtils.smoothstep(handOver.current, 0, 0.5);
    const floorOpacity = FLOOR_SHADOW_OPACITY * daylit * sunsTurn;
    if (floor.current) {
      floor.current.opacity = floorOpacity;
      floor.current.color.lerp(sunlight.floorShadow, blend);
    }
    if (key.current) {
      const casting = floorOpacity > 0.002;
      key.current.castShadow = casting;
      // The shadow map is only redrawn on request: when the sun starts or
      // stops casting, ask, or its shadow stays missing (or stale) until
      // something else does -- like turning the desk.
      if (casting !== sunCasting.current) {
        sunCasting.current = casting;
        gl.shadowMap.needsUpdate = true;
        invalidate();
      }
    }
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

// Sun through a window behind the viewer, on the chair's side of the room:
// the window itself is never in view, only its light, thrown across the
// desk, the monitor and everything on them as a grid of soft panes. The last of
// it at sunset, pink to amber, from one side; the first of it after sunrise,
// golden, from the other, since the sun rises and sets on opposite sides; and
// in between, the day's skylight, a soft cool glow (DAYTIME). A
// spotlight carrying the panes as its pattern (three's SpotLight.map, which
// needs the light's shadow on), plus a little warm fill on the desk. Both
// fade in slowly while moving the way the sun moves them: the sunset panes
// climb as the sun sinks, so they rise in from below and leave upward; the
// morning ones slide down as the sun climbs, so they come in from above and
// leave downward.
type Sky = NonNullable<ReturnType<typeof useDeskTime>["solar"]>;
type WindowSide = {
  // Where the window is, behind and above the viewer, and which way the
  // panes lean.
  from: [number, number, number];
  lean: number;
  stops: [number, string][];
  glowColor: string;
  glowAt: [number, number, number];
  // How strong it is now: 0 outside its part of the day.
  strength: (sky: Sky) => number;
  // How soft the panes' edges are (px of blur on the pattern), and the
  // cone's edge.
  blur: number;
  penumbra: number;
  // Whether the twilight's glow colour nudges it (the sunset and sunrise
  // panes); daylight stays its own white.
  tinted: boolean;
  // Which way the panes travel over their time: 1 rising, -1 falling.
  travel: 1 | -1;
  // Whether it casts the shadows itself. Not in the morning: the room is
  // light then and the floor shows the desk's shadow, which the sun draws
  // from the window's direction (DeskLighting), and two would double it.
  castsShadows: boolean;
};
const EVENING: WindowSide = {
  from: [2.2, 2.8, 3.2],
  lean: -0.1,
  stops: [[0, "#ff7fae"], [0.5, "#ff9a8f"], [1, "#ffbf72"]],
  glowColor: "#ff94a8",
  glowAt: [0.55, 1.35, 0.4],
  strength: (sky) => (!sky.morning && windowLit(sky) ? windowLightStrength(sky.horizonMix, sky.backgroundNightMix) : 0),
  blur: 4,
  penumbra: 0.15,
  tinted: true,
  travel: 1,
  castsShadows: true,
};
const MORNING: WindowSide = {
  from: [-2.2, 2.8, 3.2],
  lean: 0.1,
  stops: [[0, "#ffe39a"], [0.5, "#ffca5c"], [1, "#ffab45"]],
  glowColor: "#ffc46a",
  glowAt: [-0.55, 1.35, 0.4],
  strength: (sky) => (sky.morning && windowLit(sky) ? morningLightStrength(sky.horizonMix, sky.backgroundNightMix) : 0),
  blur: 4,
  penumbra: 0.15,
  tinted: true,
  travel: -1,
  castsShadows: false,
};
// The rest of the day, between the morning light and the sunset. The window
// faces northeast, so the sun itself no longer comes through it: what does
// is skylight, from higher up, cool and soft. Its panes are blurred to a
// glow, faintly blue, and it casts no shadows: the room's sun, still the
// main light, draws those (DeskLighting).
const DAYTIME: WindowSide = {
  from: [0.6, 3.4, 3.4],
  lean: -0.04,
  stops: [[0, "#f3f6ff"], [0.5, "#e9efff"], [1, "#dfe7ff"]],
  glowColor: "#e2eaff",
  glowAt: [0, 1.35, 0.4],
  strength: daylightWindowStrength,
  blur: 6,
  penumbra: 0.35,
  tinted: false,
  travel: -1,
  castsShadows: false,
};
// Whether the window carries the room's light now (1) or the sun does (0):
// the window in the morning and twilight looks, the sun the rest of the day.
export function windowLightShare(solar: ReturnType<typeof useDeskTime>["solar"], enabled: boolean) {
  return enabled && solar && windowLit(solar) ? 1 : 0;
}

// Where the sun stands while the window has the room: along the window's
// light, further out, as a directional light only needs the direction (the
// morning one matches MORNING.from aimed at WINDOW_AIM, so its shadows fall
// exactly the window's way).
const MORNING_FLOOR_SUN = new THREE.Vector3(-4.4, 2.6, 6.6);
// How much of its light the sun keeps in the morning window.
const MORNING_SUN_KEEPS = 0.45;
const EVENING_FLOOR_SUN = new THREE.Vector3(4.4, 4.4, 6.4);

// The daylight window's strength, before WINDOW_LIGHT_BOOST: a soft
// secondary light, well under the sunrise and sunset panes.
const DAYTIME_STRENGTH = 0.45;

// How strong the day's skylight through the window is: on from when the
// morning panes give way until the room goes dark, never alongside either
// of the other two window lights.
export function daylightWindowStrength(sky: Sky) {
  return !windowLit(sky) && !roomIsDark(sky) && sky.altitude > 0 ? DAYTIME_STRENGTH * sky.daylight : 0;
}

// Where the panes land: across the desk and up onto the monitor.
const WINDOW_AIM: [number, number, number] = [0, 0.85, -0.1];
// The strength functions peak around 0.6 (evening) or 1 (morning); this lifts
// the evening light to nearly full at sunset, and is capped at 1.
const WINDOW_LIGHT_BOOST = 1.7;
const WINDOW_SPOT_INTENSITY = 4;
const WINDOW_GLOW_INTENSITY = 1.6;
// Slower than the room's lights: the panes fade in over a couple of seconds
// while easing a short way into place, rather than sliding with the clock.
const PATCH_FADE_RATE = 1.6;
const PATCH_DRIFT_RATE = 1.2;
// The entrance: how far below or above the panes start, and how quickly
// they arrive.
const PATCH_ENTRANCE_DISTANCE = 0.5;
const PATCH_ARRIVE_RATE = 0.9;
const PATCH_SETTLE_SECONDS = 6;
const WHITE = new THREE.Color("#ffffff");

function paneTexture(side: WindowSide) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.filter = `blur(${side.blur}px)`;
  ctx.fillStyle = "#ffffff";
  // A window of four by three small panes with clear bars between them,
  // upright with a slight lean, so several bars cross the desk, the keyboard
  // and the monitor...
  ctx.setTransform(1, 0.03 * Math.sign(-side.lean), side.lean, 1, side.lean < 0 ? 96 : 60, 86);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) ctx.fillRect(col * 92, row * 116, 68, 92);
  // ...coloured top to bottom by the light, keeping their soft edges.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = "none";
  ctx.globalCompositeOperation = "source-in";
  const gradient = ctx.createLinearGradient(0, 40, 0, 480);
  for (const [at, color] of side.stops) gradient.addColorStop(at, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  // A light's pattern only takes effect where the texture is opaque, and
  // passes the light at full strength elsewhere: the bars and the rest of
  // the cone must be solid black to block it.
  const opaque = document.createElement("canvas");
  opaque.width = opaque.height = 512;
  const out = opaque.getContext("2d")!;
  out.fillStyle = "#000000";
  out.fillRect(0, 0, 512, 512);
  out.drawImage(canvas, 0, 0);
  const map = new THREE.CanvasTexture(opaque);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

function WindowPatch({ side, solar, tint, enabled }: { side: WindowSide; solar: ReturnType<typeof useDeskTime>["solar"]; tint: THREE.Color; enabled: boolean }) {
  const spot = useRef<THREE.SpotLight>(null);
  const glowLight = useRef<THREE.PointLight>(null);
  const [aim] = useState(() => new THREE.Object3D());
  const map = useMemo(() => paneTexture(side), [side]);
  useEffect(() => () => map.dispose(), [map]);
  useRenderAfterChange(PATCH_SETTLE_SECONDS, [solar, tint, enabled], { shadows: true });
  // How low the sun is, eased: where the panes fall follows this, not the
  // clock, so a jump in time is a gentle drift. null until the first frame.
  const drift = useRef<number | null>(null);
  // 0 away, 1 in place, eased; and which way they're coming from or going to
  // (-1 below, 1 above), picked only while fully in or out so a change of
  // mind mid-way turns them back rather than making them jump.
  const arrival = useRef(0);
  const away = useRef(-side.travel);
  const casting = useRef(false);

  useFrame(({ gl, invalidate }, delta) => {
    const light = spot.current;
    if (!light) return;
    const step = Math.min(delta, MAX_FRAME_DELTA);
    const horizon = solar?.horizonMix ?? 0;
    const strength = enabled && solar ? side.strength(solar) : 0;
    const low = THREE.MathUtils.smoothstep(horizon, 0.35, 1);
    drift.current = drift.current === null ? low : THREE.MathUtils.lerp(drift.current, low, 1 - Math.exp(-step * PATCH_DRIFT_RATE));
    const d = drift.current;
    const fade = 1 - Math.exp(-step * PATCH_FADE_RATE);
    light.intensity = THREE.MathUtils.lerp(light.intensity, Math.min(1, strength * WINDOW_LIGHT_BOOST) * WINDOW_SPOT_INTENSITY, fade);
    light.color.lerp(side.tinted ? tint : WHITE, fade);
    // The pattern only shows with the light's shadow on. Off while it's dark,
    // though: the floor draws every casting light's shadow at full strength,
    // however dim the light, so a dark window would still print one.
    const nowCasting = light.intensity > 0.02;
    light.castShadow = nowCasting;
    // Its shadows go in the first half of a fade out (and come in over the
    // second half of a fade in), leaving the floor to the sun's in between:
    // the pattern doesn't need them to show.
    light.shadow.intensity = side.castsShadows ? THREE.MathUtils.smoothstep(light.intensity / WINDOW_SPOT_INTENSITY, 0.5, 0.8) : 0;
    // As for the sun: the shadow map has to be redrawn when this starts or
    // stops casting.
    if (nowCasting !== casting.current) {
      casting.current = nowCasting;
      gl.shadowMap.needsUpdate = true;
      invalidate();
    }
    const present = strength > 0.02 ? 1 : 0;
    if (arrival.current < 0.02 && present) away.current = -side.travel;
    if (arrival.current > 0.98 && !present) away.current = side.travel;
    arrival.current = THREE.MathUtils.lerp(arrival.current, present, 1 - Math.exp(-step * PATCH_ARRIVE_RATE));
    const entrance = away.current * PATCH_ENTRANCE_DISTANCE * (1 - THREE.MathUtils.smootherstep(arrival.current, 0, 1));
    // The lower the sun, the flatter it comes in, so the panes land higher
    // and reach further: a small range, so they settle rather than slide.
    const [x, y, z] = side.from;
    light.position.set(x, y - 0.6 * d, z);
    aim.position.set(WINDOW_AIM[0], WINDOW_AIM[1] + 0.15 * d + entrance, WINDOW_AIM[2]);
    if (glowLight.current) glowLight.current.intensity = THREE.MathUtils.lerp(glowLight.current.intensity, strength * WINDOW_GLOW_INTENSITY, fade);
  });

  return (
    <>
      <primitive object={aim} />
      <spotLight
        ref={spot}
        target={aim}
        map={map}
        intensity={0}
        angle={0.34}
        penumbra={side.penumbra}
        decay={0}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
      <pointLight ref={glowLight} position={side.glowAt} color={side.glowColor} intensity={0} distance={2.6} decay={2} />
    </>
  );
}

export function WindowLight({ solar, glow, enabled }: { solar: ReturnType<typeof useDeskTime>["solar"]; glow: string; enabled: boolean }) {
  // The panes carry their own colours; the twilight glow only nudges them.
  const tint = useMemo(() => new THREE.Color("#ffffff").lerp(new THREE.Color(glow), 0.2), [glow]);
  return (
    <>
      <WindowPatch side={EVENING} solar={solar} tint={tint} enabled={enabled} />
      <WindowPatch side={MORNING} solar={solar} tint={tint} enabled={enabled} />
      <WindowPatch side={DAYTIME} solar={solar} tint={tint} enabled={enabled} />
    </>
  );
}
