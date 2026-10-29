import { createStepGesture } from "./deskGestures";

const options = { stepPx: 40, lockMs: 700, gapMs: 250 };
const wheel = (deltaY: number, extra: Partial<{ deltaMode: number; ctrlKey: boolean }> = {}) => ({
  deltaY,
  deltaMode: 0,
  ctrlKey: false,
  ...extra,
});

test("small deltas add up to one step in their direction", () => {
  const steps = createStepGesture(options);
  expect(steps.push(wheel(15), 0)).toBe(0);
  expect(steps.push(wheel(15), 16)).toBe(0);
  expect(steps.push(wheel(15), 32)).toBe(1);

  const back = createStepGesture(options);
  expect(back.push(wheel(-45), 0)).toBe(-1);
});

test("a long momentum tail is one step, however long it keeps coming", () => {
  const steps = createStepGesture(options);
  const results: number[] = [];
  // Two seconds of trackpad momentum, an event every 16ms.
  for (let now = 0; now <= 2000; now += 16) results.push(steps.push(wheel(30), now));
  expect(results.filter((step) => step !== 0)).toEqual([1]);
});

test("a quiet gap after the lock ends the gesture, so the next one steps again", () => {
  const steps = createStepGesture(options);
  expect(steps.push(wheel(50), 0)).toBe(1);
  // Still inside the lock: ignored, and the lock is held open by the events.
  expect(steps.push(wheel(50), 600)).toBe(0);
  expect(steps.push(wheel(50), 800)).toBe(0);
  // Quiet for longer than the gap, past the lock.
  expect(steps.push(wheel(50), 1100)).toBe(1);
});

test("travel built up during the lock doesn't carry over", () => {
  const steps = createStepGesture(options);
  expect(steps.push(wheel(50), 0)).toBe(1);
  expect(steps.push(wheel(39), 500)).toBe(0);
  // After the lock, a fresh gesture needs its own full step.
  expect(steps.push(wheel(30), 1000)).toBe(0);
  expect(steps.push(wheel(30), 1016)).toBe(1);
});

test("line-mode wheels count each line as 16px", () => {
  const steps = createStepGesture(options);
  expect(steps.push(wheel(3, { deltaMode: 1 }), 0)).toBe(1);
});

test("a trackpad pinch (ctrl + wheel) never changes the time", () => {
  const steps = createStepGesture(options);
  for (let now = 0; now < 500; now += 16) expect(steps.push(wheel(80, { ctrlKey: true }), now)).toBe(0);
  // And it leaves no travel behind for the next real scroll.
  expect(steps.push(wheel(30), 600)).toBe(0);
});
