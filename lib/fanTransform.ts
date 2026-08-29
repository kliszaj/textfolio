export type CardTransform = {
  x: number;
  y: number;
  rotate: number;
};

const MAX_SPREAD_PX = 220;
const MAX_ROTATE_DEG = 12;
const MAX_LIFT_PX = 40;

export function computeCardTransform(
  index: number,
  total: number,
  fanProgress: number
): CardTransform {
  if (fanProgress === 0) {
    return { x: 0, y: 0, rotate: 0 };
  }
  if (total <= 1) {
    return { x: 0, y: -fanProgress * MAX_LIFT_PX, rotate: 0 };
  }
  const mid = (total - 1) / 2;
  const offsetFromCenter = index - mid;
  const normalized = offsetFromCenter / mid;
  return {
    x: normalized * MAX_SPREAD_PX * fanProgress,
    y: -fanProgress * MAX_LIFT_PX * (1 - Math.abs(normalized) * 0.3),
    rotate: normalized * MAX_ROTATE_DEG * fanProgress,
  };
}
