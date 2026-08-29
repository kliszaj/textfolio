export type FanMechanic = "bottom" | "corner";

export type FanSheetConfig = {
  mechanic: FanMechanic;
  recedePercents: [number, number, number, number];
  rotateDegrees: [number, number, number, number];
  brightnessFalloff: number;
  focusRevealPercent: number;
};

export type SheetInset = {
  bottom: number;
  right: number;
  rotate: number;
  brightness: number;
};

export function computeSheetInset(
  depth: number,
  fanProgress: number,
  config: FanSheetConfig
): SheetInset {
  const brightness = 1 - depth * config.brightnessFalloff;

  if (fanProgress === 0) {
    return { bottom: 0, right: 0, rotate: 0, brightness };
  }

  const recede = config.recedePercents[depth] * fanProgress;
  const rotate = config.rotateDegrees[depth] * fanProgress;

  if (config.mechanic === "bottom") {
    return { bottom: recede, right: 0, rotate, brightness };
  }

  return { bottom: recede / 2, right: recede / 2, rotate, brightness };
}

export function computeFocusedInset(config: FanSheetConfig): SheetInset {
  return { bottom: config.focusRevealPercent, right: 0, rotate: 0, brightness: 1 };
}
