import { render, screen, fireEvent } from "@testing-library/react";
import { FanDebugPanel } from "./FanDebugPanel";
import type { FanSheetConfig } from "@/lib/fanSheet";

const config: FanSheetConfig = {
  mechanic: "bottom",
  recedePercents: [12, 8, 4, 0],
  brightnessFalloff: 0.05,
};

function renderPanel(overrides: Partial<Parameters<typeof FanDebugPanel>[0]> = {}) {
  const onConfigChange = jest.fn();
  const onTransitionMsChange = jest.fn();
  const onThresholdPxChange = jest.fn();
  render(
    <FanDebugPanel
      config={config}
      onConfigChange={onConfigChange}
      transitionMs={280}
      onTransitionMsChange={onTransitionMsChange}
      thresholdPx={250}
      onThresholdPxChange={onThresholdPxChange}
      {...overrides}
    />
  );
  return { onConfigChange, onTransitionMsChange, onThresholdPxChange };
}

test("clicking the Corner Cascade button switches the mechanic", () => {
  const { onConfigChange } = renderPanel();
  fireEvent.click(screen.getByText("Corner Cascade"));
  expect(onConfigChange).toHaveBeenCalledWith({ ...config, mechanic: "corner" });
});

test("moving a depth's recede slider updates only that depth", () => {
  const { onConfigChange } = renderPanel();
  fireEvent.change(screen.getByLabelText(/Case One recede/i), { target: { value: "20" } });
  expect(onConfigChange).toHaveBeenCalledWith({
    ...config,
    recedePercents: [12, 20, 4, 0],
  });
});

test("moving the brightness falloff slider updates the config", () => {
  const { onConfigChange } = renderPanel();
  fireEvent.change(screen.getByLabelText(/Brightness falloff/i), { target: { value: "0.1" } });
  expect(onConfigChange).toHaveBeenCalledWith({ ...config, brightnessFalloff: 0.1 });
});

test("moving the transition slider calls onTransitionMsChange", () => {
  const { onTransitionMsChange } = renderPanel();
  fireEvent.change(screen.getByLabelText(/Transition/i), { target: { value: "500" } });
  expect(onTransitionMsChange).toHaveBeenCalledWith(500);
});

test("moving the threshold slider calls onThresholdPxChange", () => {
  const { onThresholdPxChange } = renderPanel();
  fireEvent.change(screen.getByLabelText(/trigger threshold/i), { target: { value: "300" } });
  expect(onThresholdPxChange).toHaveBeenCalledWith(300);
});
