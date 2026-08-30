export type StrokeTextTrigger = "mount" | "hover" | "scroll" | "loop";
export type StrokeTextFillMode = "fade" | "wipe" | "none";

export type StrokeTextConfig = {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  drawDuration: number;
  fillDelay: number;
  stagger: number;
  ease: string;
  trigger: StrokeTextTrigger;
  fillMode: StrokeTextFillMode;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  reverse: boolean;
};

export const DEFAULT_STROKE_TEXT_CONFIG: StrokeTextConfig = {
  strokeColor: "#FFFFFF",
  fillColor: "#FFFFFF",
  strokeWidth: 2.6,
  drawDuration: 1.8,
  fillDelay: 0.2,
  stagger: 0.05,
  ease: "expo.out",
  trigger: "mount",
  fillMode: "fade",
  fontSize: 220,
  fontWeight: 900,
  letterSpacing: 0,
  reverse: false,
};
