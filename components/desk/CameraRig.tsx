"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ComponentRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { DeskFraming } from "./DeskFraming";
import type { ScreenPose } from "./DeskModel";
import { idlePose, typingPose, zoomPose, type BrowserLayout, type DeskVariant, type Phase } from "./deskLayout";

// Timed eases rather than exponential chasing: a gentle start, a gentle
// landing, and arrival exactly on the pose so the handoff needs no snap.
const ZOOM_SECONDS = 1.7;
const RETURN_SECONDS = 1.3;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

type Tween = {
  phase: Phase;
  startedAt: number;
  fromOffset: THREE.Spherical;
  toOffset: THREE.Spherical;
  fromTarget: THREE.Vector3;
  done: boolean;
};

// Reused every frame of a tween rather than allocated per frame.
const scratchOffset = new THREE.Vector3();

export function CameraRig({
  framing,
  screen,
  layout,
  phase,
  variant,
  startZoomed,
  onArrive,
  onReturned,
  zoomTarget = "page",
  onFramed,
}: {
  framing: DeskFraming;
  screen: ScreenPose;
  layout: BrowserLayout | null;
  phase: Phase;
  variant: DeskVariant;
  startZoomed: boolean;
  onArrive: () => void;
  onReturned: () => void;
  // What a zoom lands on: the case study's page area, or the typing window.
  zoomTarget?: "page" | "typing";
  // Called once, on the frame the camera is first put in place.
  onFramed?: () => void;
}) {
  const { camera } = useThree();
  const invalidate = useThree((state) => state.invalidate);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const lookAt = useRef(new THREE.Vector3());
  const tween = useRef<Tween | null>(null);
  const initialized = useRef(false);
  const previousPhase = useRef<Phase>(phase);
  const previousFraming = useRef(framing);
  const size = useThree((state) => state.size);
  const aspect = size.width / size.height;
  // Both poses only change with the screen, the framing or the viewport, so
  // they are worked out then rather than on every frame.
  const idle = useMemo(() => idlePose(screen, framing, aspect), [screen, framing, aspect]);
  const zoom = useMemo(
    () => zoomTarget === "typing" && layout
      ? typingPose(screen, camera as THREE.PerspectiveCamera, layout, { w: size.width, h: size.height })
      : zoomPose(screen, camera as THREE.PerspectiveCamera, variant, layout),
    // aspect: zoomPose reads the camera's, which R3F keeps in step with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [screen, camera, variant, layout, aspect, zoomTarget, size],
  );

  // The canvas renders on demand: a change of phase or framing needs a frame
  // to act on, and a tween keeps asking for more until it lands.
  useEffect(() => {
    invalidate();
  }, [phase, framing, invalidate]);

  useFrame(({ clock }) => {
    const cam = camera as THREE.PerspectiveCamera;

    if (!initialized.current) {
      initialized.current = true;
      const start = startZoomed ? zoom : idle;
      cam.position.copy(start.position);
      lookAt.current.copy(start.target);
      cam.lookAt(lookAt.current);
      // This frame is drawn from the right place: the stage can show it.
      onFramed?.();
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
    const goal = phase === "zooming" ? zoom : idle;
    if (!tween.current || tween.current.phase !== phase) {
      tween.current = {
        phase,
        startedAt: clock.elapsedTime,
        fromOffset: new THREE.Spherical().setFromVector3(scratchOffset.copy(cam.position).sub(pivot)),
        toOffset: new THREE.Spherical().setFromVector3(scratchOffset.copy(goal.position).sub(pivot)),
        fromTarget: lookAt.current.clone(),
        done: false,
      };
    }
    if (tween.current.done) return;
    invalidate();

    const seconds = phase === "zooming" ? ZOOM_SECONDS : RETURN_SECONDS;
    const t = Math.min(1, (clock.elapsedTime - tween.current.startedAt) / seconds);
    const e = easeInOutCubic(t);
    const from = tween.current.fromOffset;
    const to = tween.current.toOffset;
    const turn = Math.atan2(Math.sin(to.theta - from.theta), Math.cos(to.theta - from.theta));
    // Apparent size goes with 1 / distance, so a linear distance crams most
    // of the visible zoom into the last frames and the page seems to slam
    // in. Interpolating by ratio makes the growth even, so the ease's gentle
    // landing actually reads as one.
    const radius = from.radius * Math.pow(to.radius / from.radius, e);
    cam.position.copy(pivot).add(scratchOffset.setFromSphericalCoords(
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
      target={idle.target}
      enablePan={false}
      // The wheel steps through the times of day instead.
      enableZoom={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.6}
      minDistance={1.6}
      // A portrait viewport rests further out (idlePose); the orbit must not
      // snap it back in on the first drag.
      maxDistance={Math.max(5.5, idle.position.distanceTo(idle.target) * 1.1)}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI / 2 - 0.08}
    />
  );
}
