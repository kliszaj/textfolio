export type FanMechanic = "bottom" | "corner";

export type FanSheetConfig = {
  mechanic: FanMechanic;
  recedePercents: [number, number, number, number];
  brightnessFalloff: number;
};

export type SheetInset = {
  bottom: number;
  right: number;
  brightness: number;
};

export function computeSheetInset(
  depth: number,
  fanProgress: number,
  config: FanSheetConfig
): SheetInset {
  const recede = config.recedePercents[depth] * fanProgress;
  const brightness = 1 - depth * config.brightnessFalloff;

  if (config.mechanic === "bottom") {
    return { bottom: recede, right: 0, brightness };
  }

  return { bottom: recede / 2, right: recede / 2, brightness };
}
