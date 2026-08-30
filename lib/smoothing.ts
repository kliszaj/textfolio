// Distance at which a value is close enough to its target to be snapped onto
// it, so the animation loop can stop instead of re-rendering forever on deltas
// too small to see.
const SETTLE_EPSILON = 0.0005;

// Frame-rate independent exponential ease. Over any elapsed time the value
// covers the same fraction of the remaining distance, so motion looks the same
// at 60Hz and 144Hz. tauMs is the time constant: bigger is slower and smoother.
export function smoothTowards(
  current: number,
  target: number,
  dtMs: number,
  tauMs: number
): number {
  if (tauMs <= 0) return target;
  if (dtMs <= 0) return current;

  const next = current + (target - current) * (1 - Math.exp(-dtMs / tauMs));

  return Math.abs(target - next) < SETTLE_EPSILON ? target : next;
}
