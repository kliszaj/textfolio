"use client";

import { useEffect, useMemo } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildWorkstation, animateWorkstation } from "@/lib/workspace/model";
import { prepareScenes } from "@/lib/workspace/scenes";
import { batchStatic } from "@/lib/workspace/batch";

export type ScreenPose = {
  center: THREE.Vector3;
  quaternion: THREE.Quaternion;
  normal: THREE.Vector3;
  width: number;
  height: number;
};

// Same wallpaper the on-screen desktop uses, and its pixel size.
const WALLPAPER_URL = "/desk/wallpaper.webp";
const WALLPAPER_ASPECT = 2560 / 1442;

export function DeskModel({ onScreen, hour = 14, darkness = 0 }: { onScreen: (pose: ScreenPose) => void; hour?: number; darkness?: number }) {
  const { scene: mouseAsset } = useGLTF("/models/mx-master-3s.glb");
  const wallpaper = useTexture(WALLPAPER_URL);

  const { workspace, scenes } = useMemo(() => {
    const parent = new THREE.Group();
    const mouse = mouseAsset.clone(true);
    mouse.traverse((object) => {
      if (object instanceof THREE.Mesh) object.castShadow = object.receiveShadow = true;
    });
    mouse.userData.noMerge = true;
    const model = buildWorkstation(parent, mouse);
    const scenes = prepareScenes(model, { illustratedScreen: false });
    // The live desktop is laid over the display; if it ever drops a frame
    // (a resize), the same wallpaper shows through rather than an old
    // illustrated screen. Cropped top and bottom to cover, like CSS `cover`.
    const display = model.getObjectByName("Illustrated editor display") as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    const { width, height } = display.geometry.parameters;
    const map = wallpaper.clone();
    map.colorSpace = THREE.SRGBColorSpace;
    map.repeat.set(1, WALLPAPER_ASPECT / (width / height));
    map.offset.set(0, (1 - map.repeat.y) / 2);
    display.material.map?.dispose();
    display.material.map = map;
    display.material.needsUpdate = true;
    batchStatic(model, scenes.roots, { mergeDynamic: true });
    return { workspace: model, scenes };
  }, [mouseAsset, wallpaper]);

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
    scenes.update(hour, delta, false, darkness);
    animateWorkstation(workspace, clock.elapsedTime);
  });

  useEffect(() => () => scenes.dispose(), [scenes]);

  return <primitive object={workspace} />;
}

useGLTF.preload("/models/mx-master-3s.glb");
useTexture.preload(WALLPAPER_URL);
