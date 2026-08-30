// Pull-to-exit: the inverse of the sheet lift that brought you here. At the top
// of a case study, keeping on scrolling up drags the page back down onto the
// stack. It is deliberately a gesture you have to mean -- a stray trackpad
// flick or a rubber-band bounce must not navigate anyone away -- so it needs
// real accumulated travel, and it shows the whole way what it is about to do.

// How much upward travel commits the exit.
export const EXIT_PULL_THRESHOLD_PX = 160;

// The page follows at less than gesture speed, so it reads as pulling against
// the weight of the stack rather than sliding freely.
const PULL_DAMPING = 0.55;

// However hard you pull, the page stops short of leaving on its own.
const MAX_PULL_OFFSET_PX = 340;

export function pullAfterWheel(currentPull: number, deltaY: number, atTop: boolean): number {
  // Anywhere but the very top, an upward wheel is ordinary scrolling.
  if (!atTop) return 0;
  return Math.max(0, currentPull - deltaY);
}

export function pullOffset(pull: number): number {
  if (pull <= 0) return 0;
  // Asymptotic: early travel is nearly free, and it stiffens the further you go.
  const damped = pull * PULL_DAMPING;
  return (MAX_PULL_OFFSET_PX * damped) / (MAX_PULL_OFFSET_PX + damped);
}

export function pullProgress(pull: number): number {
  if (pull <= 0) return 0;
  return Math.min(1, pull / EXIT_PULL_THRESHOLD_PX);
}

export function shouldExit(pull: number): boolean {
  return pull >= EXIT_PULL_THRESHOLD_PX;
}
