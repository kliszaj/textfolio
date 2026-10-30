import { act, fireEvent, render, screen } from "@testing-library/react";
import { DeskClock, useDeskTime } from "./DeskClock";

// The clock is stepped by scrolling on the stage; the harness exposes the
// same step as plain buttons so the hook can be driven directly.
function ClockPreview() {
  const clock = useDeskTime();
  return (
    <div data-testid="preview" data-hour={clock.hour} data-scene-hour={clock.sceneHour} data-night={clock.night}>
      <button type="button" onClick={() => clock.step(-1)}>earlier</button>
      <button type="button" onClick={() => clock.step(1)}>later</button>
      <DeskClock clock={clock} />
    </div>
  );
}

// Long enough for any step's run to finish (they take up to 2s).
const STEP_DONE_MS = 2100;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-28T13:12:00Z"));
});
afterEach(() => jest.useRealTimers());

test("counts through minutes to twilight and returns to the live Stockholm clock", () => {
  render(<ClockPreview />);
  expect(screen.getByLabelText("14:12, Stockholm")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Back to the current time" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "later" }));
  // A two-hour step runs for under a second (longer steps take longer).
  act(() => jest.advanceTimersByTime(450));
  expect(screen.queryByLabelText("14:12, Stockholm")).not.toBeInTheDocument();
  expect(screen.getByTestId("preview")).toHaveAttribute("data-hour", "15");
  act(() => jest.advanceTimersByTime(450));
  expect(screen.getByTestId("preview")).toHaveAttribute("data-hour", "16");
  fireEvent.click(screen.getByRole("button", { name: "Back to the current time" }));
  act(() => jest.advanceTimersByTime(STEP_DONE_MS));
  expect(screen.getByTestId("preview")).toHaveAttribute("data-night", "false");
  expect(screen.getByRole("button", { name: "Back to the current time" })).toBeDisabled();
  act(() => jest.advanceTimersByTime(60000));
  expect(screen.getByLabelText("14:13, Stockholm")).toBeInTheDocument();
});

test("accumulates rapid steps and reverses direction without losing the target", () => {
  render(<ClockPreview />);
  const later = screen.getByRole("button", { name: "later" });
  fireEvent.click(later);
  fireEvent.click(later);
  fireEvent.click(later);
  act(() => jest.advanceTimersByTime(STEP_DONE_MS));
  expect(screen.getByTestId("preview")).toHaveAttribute("data-hour", "7");
  fireEvent.click(screen.getByRole("button", { name: "earlier" }));
  act(() => jest.advanceTimersByTime(STEP_DONE_MS));
  expect(screen.getByTestId("preview")).toHaveAttribute("data-hour", "17");
});

test("night tucks the chair in and advancing to morning never cycles through intermediate furniture poses", () => {
  render(<ClockPreview />);
  const later = screen.getByRole("button", { name: "later" });
  fireEvent.click(later); // Twilight.
  act(() => jest.advanceTimersByTime(STEP_DONE_MS));
  fireEvent.click(later); // Night, even though winter dusk is before 18:00.
  expect(screen.getByTestId("preview")).toHaveAttribute("data-scene-hour", "2");
  act(() => jest.advanceTimersByTime(STEP_DONE_MS));
  expect(screen.getByTestId("preview")).toHaveAttribute("data-scene-hour", "2");
  fireEvent.click(later); // Following morning.
  for (let step = 0; step < 8; step += 1) {
    act(() => jest.advanceTimersByTime(100));
    expect(screen.getByTestId("preview")).toHaveAttribute("data-scene-hour", "7");
  }
});

test("a long step runs for longer than a short one", () => {
  render(<ClockPreview />);
  const later = screen.getByRole("button", { name: "later" });
  fireEvent.click(later); // Twilight: about two hours on.
  act(() => jest.advanceTimersByTime(1000));
  const twilightHour = screen.getByTestId("preview").getAttribute("data-hour");
  fireEvent.click(later); // Night.
  act(() => jest.advanceTimersByTime(STEP_DONE_MS));
  fireEvent.click(later); // Morning, fourteen hours on: still under way after a second.
  act(() => jest.advanceTimersByTime(1000));
  expect(screen.getByTestId("preview").getAttribute("data-hour")).not.toBe("7");
  act(() => jest.advanceTimersByTime(STEP_DONE_MS));
  expect(screen.getByTestId("preview")).toHaveAttribute("data-hour", "7");
  expect(twilightHour).toBe("16");
});
