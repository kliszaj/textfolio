// Turns a stream of wheel deltas into single steps through the time of day.
// One gesture is one step: a trackpad's momentum tail keeps arriving long
// after the fingers lift, so after a step the stepper stays locked for as
// long as events keep coming, and only a quiet gap ends the gesture.

export type StepGestureOptions = {
  // Travel that counts as one step.
  stepPx: number;
  // The pause after a step (the clock's own animation).
  lockMs: number;
  // The quiet gap that ends a gesture.
  gapMs: number;
};

export type WheelInput = { deltaY: number; deltaMode: number; ctrlKey: boolean };

// deltaMode 1 is lines (a mouse wheel on some systems), not pixels.
const LINE_PX = 16;

export function createStepGesture({ stepPx, lockMs, gapMs }: StepGestureOptions) {
  let travel = 0;
  let lockedUntil = 0;
  return {
    // The step this event completes: 1 later, -1 earlier, or 0 for none.
    push(event: WheelInput, now: number): -1 | 0 | 1 {
      // A trackpad pinch arrives as a wheel event with ctrlKey set; it zooms
      // the page, it shouldn't change the time.
      if (event.ctrlKey) return 0;
      if (now < lockedUntil) {
        travel = 0;
        lockedUntil = Math.max(lockedUntil, now + gapMs);
        return 0;
      }
      travel += event.deltaY * (event.deltaMode === 1 ? LINE_PX : 1);
      if (Math.abs(travel) < stepPx) return 0;
      const direction = travel > 0 ? 1 : -1;
      travel = 0;
      lockedUntil = now + lockMs;
      return direction;
    },
  };
}
