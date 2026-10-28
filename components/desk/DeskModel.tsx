"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildWorkstation, animateWorkstation } from "@/lib/workspace/model";
import { prepareScenes } from "@/lib/workspace/scenes";
import { batchStatic } from "@/lib/workspace/batch";

// Spike: the office-portfolio workspace, frozen at an afternoon "coding" scene
// instead of following the time-of-day theme.
const SCENE_HOUR = 14;

export type ScreenPose = {
  center: THREE.Vector3;
  quaternion: THREE.Quaternion;
  normal: THREE.Vector3;
  width: number;
  height: number;
};

export function DeskModel({ onScreen }: { onScreen: (pose: ScreenPose) => void }) {
  const { scene: mouseAsset } = useGLTF("/models/mx-master-3s.glb");

  const { workspace, scenes } = useMemo(() => {
    const parent = new THREE.Group();
    const mouse = mouseAsset.clone(true);
    mouse.traverse((object) => {
      if (object instanceof THREE.Mesh) object.castShadow = object.receiveShadow = true;
    });
    mouse.userData.noMerge = true;
    const model = buildWorkstation(parent, mouse);
    const scenes = prepareScenes(model);
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

  useFrame(({ clock }, delta) => {
    scenes.update(SCENE_HOUR, delta, false);
    animateWorkstation(workspace, clock.elapsedTime);
  });

  useEffect(() => () => scenes.dispose(), [scenes]);

  return <primitive object={workspace} />;
}

useGLTF.preload("/models/mx-master-3s.glb");
