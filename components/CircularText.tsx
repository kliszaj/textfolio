import type { CSSProperties } from "react";
import styles from "./CircularText.module.css";

type CircularTextProps = {
  text?: string;
  spinDuration?: number;
  className?: string;
};

// The spin is a CSS animation of transform, which the browser runs off the main
// thread: it keeps turning while the page is busy, as it is building the desk.
export function CircularText({ text = "", spinDuration = 20, className = "" }: CircularTextProps) {
  const letters = Array.from(text);

  return (
    <div
      role="status"
      aria-label="Loading portfolio"
      className={`${styles.circularText} ${className}`}
      style={{ "--circular-text-spin": `${spinDuration}s` } as CSSProperties}
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
    </div>
  );
}
