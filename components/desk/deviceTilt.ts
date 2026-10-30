"use client";

import { useEffect, useRef } from "react";

// Degrees of tilt, either way, that take the desk to its furthest lean.
const TILT_RANGE_DEG = 20;
// How quickly the resting angle follows the phone, per reading: whatever angle
// it's held at becomes level again within a few seconds, so only a change of
// tilt moves the desk.
const REST_FOLLOW = 0.004;

type Tilt = { x: number; y: number };

const clamp = (value: number) => Math.min(1, Math.max(-1, value));

// The phone's tilt from how it's being held, -1 to 1 each way: x leaning
// left-right, y top towards or away. iOS only gives the readings after a tap
// says yes, so it asks on the first touch. Off with reduced motion.
export function useDeviceTilt(enabled: boolean, onChange: () => void) {
  const tilt = useRef<Tilt>({ x: 0, y: 0 });

  useEffect(() => {
    tilt.current = { x: 0, y: 0 };
    if (!enabled || typeof DeviceOrientationEvent === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let rest: { beta: number; gamma: number } | null = null;
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) return;
      rest ??= { beta: event.beta, gamma: event.gamma };
      rest.beta += (event.beta - rest.beta) * REST_FOLLOW;
      rest.gamma += (event.gamma - rest.gamma) * REST_FOLLOW;
      tilt.current = {
        x: clamp((event.gamma - rest.gamma) / TILT_RANGE_DEG),
        y: clamp((event.beta - rest.beta) / TILT_RANGE_DEG),
      };
      onChange();
    };
    const listen = () => window.addEventListener("deviceorientation", onOrientation);

    const requestPermission = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission;
    const ask = () => {
      requestPermission?.().then((answer) => {
        if (answer === "granted") listen();
      }, () => {});
    };
    if (requestPermission) window.addEventListener("touchend", ask, { once: true });
    else listen();

    return () => {
      window.removeEventListener("touchend", ask);
      window.removeEventListener("deviceorientation", onOrientation);
    };
  }, [enabled, onChange]);

  return tilt;
}
