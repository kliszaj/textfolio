"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { useDeskTime } from "./DeskClock";
import type { ScreenPose } from "./DeskModel";
import { windowLightStrength } from "./DuskSky";
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

export function DeskLighting({ solar, screen }: { solar: ReturnType<typeof useDeskTime>["solar"]; screen: ScreenPose | null }) {
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
  useRenderAfterChange(LIGHT_SETTLE_SECONDS, [sunlight, darkness, screen], { shadows: true });
  useFrame((_, delta) => {
    const blend = 1 - Math.exp(-Math.min(delta, MAX_FRAME_DELTA) * LIGHT_EASE_RATE);
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
const scratchToCamera = new THREE.Vector3();

export function WindowLight({ solar, glow, enabled }: { solar: ReturnType<typeof useDeskTime>["solar"]; glow: string; enabled: boolean }) {
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
  useRenderAfterChange(LIGHT_SETTLE_SECONDS, [solar, tint, enabled]);

  useFrame(({ camera }, delta) => {
    const mesh = patch.current;
    if (!mesh) return;
    const horizon = solar?.horizonMix ?? 0;
    const evening = !(solar?.morning ?? true);
    const d = THREE.MathUtils.smoothstep(horizon, 0.35, 1);
    // The wall itself isn't drawn, so fade the light as the orbit turns to
    // see it edge-on rather than leave a floating sliver.
    const toCamera = scratchToCamera.copy(camera.position).sub(mesh.position).normalize();
    const facing = THREE.MathUtils.smoothstep(toCamera.z, 0.25, 0.7);
    const target = enabled && evening ? windowLightStrength(horizon, solar?.backgroundNightMix ?? 0) * WINDOW_LIGHT_OPACITY * facing : 0;
    const blend = 1 - Math.exp(-Math.min(delta, MAX_FRAME_DELTA) * LIGHT_EASE_RATE);
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
