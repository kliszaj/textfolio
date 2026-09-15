"use client";

import { useEffect } from "react";
import { motion, useAnimation, useMotionValue } from "motion/react";
import styles from "./CircularText.module.css";

type HoverBehavior = "slowDown" | "speedUp" | "pause" | "goBonkers";

type CircularTextProps = {
  text?: string;
  spinDuration?: number;
  onHover?: HoverBehavior;
  className?: string;
};

const getRotationTransition = (duration: number, from: number, loop = true) => ({
  from,
  to: from + 360,
  ease: "linear" as const,
  duration,
  type: "tween" as const,
  repeat: loop ? Infinity : 0,
});

const getTransition = (duration: number, from: number) => ({
  rotate: getRotationTransition(duration, from),
  scale: {
    type: "spring" as const,
    damping: 20,
    stiffness: 300,
  },
});

export function CircularText({
  text = "",
  spinDuration = 20,
  onHover = "speedUp",
  className = "",
}: CircularTextProps) {
  const letters = Array.from(text);
  const controls = useAnimation();
  const rotation = useMotionValue(0);

  useEffect(() => {
    const start = rotation.get();
    void controls.start({
      rotate: start + 360,
      scale: 1,
      transition: getTransition(spinDuration, start),
    });
  }, [spinDuration, text, onHover, controls, rotation]);

  const animateFromCurrentRotation = (duration: number, scale: number) => {
    const start = rotation.get();
    void controls.start({
      rotate: start + 360,
      scale,
      transition: getTransition(duration, start),
    });
  };

  const handleHoverStart = () => {
    if (onHover === "pause") {
      void controls.start({
        scale: 1,
        transition: {
          rotate: { type: "spring", damping: 20, stiffness: 300 },
          scale: { type: "spring", damping: 20, stiffness: 300 },
        },
      });
      return;
    }
    if (onHover === "slowDown") animateFromCurrentRotation(spinDuration * 2, 1);
    else if (onHover === "goBonkers") animateFromCurrentRotation(spinDuration / 20, 0.8);
    else animateFromCurrentRotation(spinDuration / 4, 1);
  };

  return (
    <motion.div
      role="status"
      aria-label="Loading portfolio"
      className={`${styles.circularText} ${className}`}
      style={{ rotate: rotation }}
      initial={{ rotate: 0 }}
      animate={controls}
      onMouseEnter={handleHoverStart}
      onMouseLeave={() => animateFromCurrentRotation(spinDuration, 1)}
    >
      {letters.map((letter, index) => {
        const rotationDeg = (360 / letters.length) * index;
        const factor = Math.PI / letters.length;
        const transform = `rotateZ(${rotationDeg}deg) translate3d(${factor * index}px, ${factor * index}px, 0)`;
        return (
          <span key={`${letter}-${index}`} aria-hidden="true" style={{ transform }}>
            {letter}
          </span>
        );
      })}
    </motion.div>
  );
}
