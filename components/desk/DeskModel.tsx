"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { buildWorkstation, animateWorkstation } from "@/lib/workspace/model";
import { prepareScenes, sceneForHour } from "@/lib/workspace/scenes";
import { batchStatic } from "@/lib/workspace/batch";
import { MAX_FRAME_DELTA, useRenderAfterChange, useRenderWhile } from "./renderOnDemand";

export type ScreenPose = {
  center: THREE.Vector3;
  quaternion: THREE.Quaternion;
  normal: THREE.Vector3;
  width: number;
  height: number;
};

// Long enough for the slowest scene change to finish: the notebook is carried
// over, the pen set aside, the cover swung open and the pen put down.
const SCENE_SETTLE_SECONDS = 8;

// A click that travelled further than this (in px) was an orbit drag.
const CLICK_SLOP_PX = 5;
const KEYBOARD = "Mechanical keyboard";
const onKeyboard = (object: THREE.Object3D | null) => {
  for (let o = object; o; o = o.parent) if (o.name === KEYBOARD) return true;
  return false;
};

export function DeskModel({ onScreen, hour = 14, darkness = 0, onKeyboardClick }: { onScreen: (pose: ScreenPose) => void; hour?: number; darkness?: number; onKeyboardClick?: () => void }) {
  const getThree = useThree((state) => state.get);
  const setCursor = (cursor: string) => {
    // Its parent: the canvas itself lets pointers through.
    const parent = getThree().gl.domElement.parentElement;
    if (parent) parent.style.cursor = cursor;
  };
  const { scene: mouseAsset } = useGLTF("/models/mx-master-3s.glb");

  const { workspace, scenes } = useMemo(() => {
    const parent = new THREE.Group();
    const mouse = mouseAsset.clone(true);
    mouse.traverse((object) => {
      if (object instanceof THREE.Mesh) object.castShadow = object.receiveShadow = true;
    });
    mouse.userData.noMerge = true;
    const model = buildWorkstation(parent, mouse);
    const scenes = prepareScenes(model, { illustratedScreen: false });
    // The live desktop sits behind the canvas (ScreenSurface), seen through a
    // hole the display cuts in it: fully transparent, but it still writes depth,
    // and whatever stands in front of the glass, like the mic, draws over it.
    const display = model.getObjectByName("Illustrated editor display") as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    display.material.map?.dispose();
    display.material.dispose();
    display.material = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, blending: THREE.NoBlending });
    batchStatic(model, scenes.roots, { mergeDynamic: true });
    return { workspace: model, scenes };
  }, [mouseAsset]);

  // The case study is laid over the illustrated display, so report where that
  // plane sits in the world once the model is built.
  useEffect(() => {
    workspace.updateMatrixWorld(true);
    const screen = workspace.getObjectByName("Illustrated editor display") as THREE.Mesh<THREE.PlaneGeometry>;
    const center = screen.getWorldPosition(new THREE.Vector3());
    const quaternion = screen.getWorldQuaternion(new THREE.Quaternion());
    const scale = screen.getWorldScale(new THREE.Vector3());
    const { width, height } = screen.geometry.parameters;
    onScreen({
      center,
      quaternion,
      normal: new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion),
      width: width * scale.x,
      height: height * scale.y,
    });
  }, [workspace, onScreen]);

  // Furniture moving casts moving shadows, so those frames redraw the map.
  useRenderAfterChange(SCENE_SETTLE_SECONDS, [scenes, hour, darkness], { shadows: true });
  // The coffee's steam never settles; it only shows in the morning scene.
  useRenderWhile(sceneForHour(hour) === "design");

  useFrame(({ clock }, delta) => {
    scenes.update(hour, Math.min(delta, MAX_FRAME_DELTA), false, darkness);
    animateWorkstation(workspace, clock.elapsedTime);
  });

  useEffect(() => () => scenes.dispose(), [scenes]);

  // The keyboard opens the typing test. The canvas's own cursor (grab) comes
  // back once the pointer leaves it.
  return (
    <primitive
      object={workspace}
      onPointerMove={(event: ThreeEvent<PointerEvent>) => {
        if (!onKeyboardClick) return;
        // R3F hands the move to every object under the pointer, front to
        // back; only the frontmost one decides, or the desk behind the
        // keyboard would reset the cursor straight away.
        event.stopPropagation();
        setCursor(onKeyboard(event.object) ? "pointer" : "");
      }}
      onPointerOut={() => {
        setCursor("");
      }}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        if (!onKeyboardClick || event.delta > CLICK_SLOP_PX || !onKeyboard(event.object)) return;
        event.stopPropagation();
        onKeyboardClick();
      }}
    />
  );
}

useGLTF.preload("/models/mx-master-3s.glb");
