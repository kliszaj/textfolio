import { render, screen, fireEvent } from "@testing-library/react";
import { FanDebugPanel } from "./FanDebugPanel";
import type { FanSheetConfig } from "@/lib/fanSheet";
import { DEFAULT_ASCII_TEXT_CONFIG } from "@/lib/asciiText";
import { DEFAULT_WARP_TEXT_CONFIG } from "@/lib/warpText";
import { DEFAULT_STROKE_TEXT_CONFIG } from "@/lib/strokeText";
import { DEFAULT_PAPER_TEXTURE_CONFIG } from "@/lib/paperTexture";

const config: FanSheetConfig = {
  mechanic: "bottom",
  bandPercents: [4, 4, 4],
  emphasisBonusPercent: 8,
  emphasisFalloff: 1.5,
  revealLeadSheets: 1.5,
  tiltStepDegrees: -1.5,
  maxTiltDegrees: 6,
  brightnessFalloff: 0.05,
};

function renderPanel(overrides: Partial<Parameters<typeof FanDebugPanel>[0]> = {}) {
  const onConfigChange = jest.fn();
  const onTransitionMsChange = jest.fn();
  const onThresholdPxChange = jest.fn();
  const onFanSplitChange = jest.fn();
  const onSmoothingMsChange = jest.fn();
  const onAsciiConfigChange = jest.fn();
  const onWarpConfigChange = jest.fn();
  const onStrokeConfigChange = jest.fn();
  const onPaperTextureConfigChange = jest.fn();
  render(
    <FanDebugPanel
      config={config}
      onConfigChange={onConfigChange}
      transitionMs={40}
      onTransitionMsChange={onTransitionMsChange}
      thresholdPx={450}
      onThresholdPxChange={onThresholdPxChange}
      fanSplit={0.45}
      onFanSplitChange={onFanSplitChange}
      smoothingMs={90}
      onSmoothingMsChange={onSmoothingMsChange}
      asciiConfig={DEFAULT_ASCII_TEXT_CONFIG}
      onAsciiConfigChange={onAsciiConfigChange}
      warpConfig={DEFAULT_WARP_TEXT_CONFIG}
      onWarpConfigChange={onWarpConfigChange}
      strokeConfig={DEFAULT_STROKE_TEXT_CONFIG}
      onStrokeConfigChange={onStrokeConfigChange}
      paperTextureConfig={DEFAULT_PAPER_TEXTURE_CONFIG}
      onPaperTextureConfigChange={onPaperTextureConfigChange}
      {...overrides}
    />
  );
  // The panel is tucked behind the Settings button; open it to reach the controls.
  fireEvent.click(screen.getByTestId("fan-debug-toggle"));
  return {
    onConfigChange,
    onTransitionMsChange,
    onThresholdPxChange,
    onFanSplitChange,
    onSmoothingMsChange,
    onAsciiConfigChange,
    onWarpConfigChange,
    onStrokeConfigChange,
    onPaperTextureConfigChange,
  };
}

function renderClosed() {
  render(
    <FanDebugPanel
      config={config}
      onConfigChange={jest.fn()}
      transitionMs={0}
      onTransitionMsChange={jest.fn()}
      thresholdPx={450}
      onThresholdPxChange={jest.fn()}
      fanSplit={0.45}
      onFanSplitChange={jest.fn()}
      smoothingMs={90}
      onSmoothingMsChange={jest.fn()}
      asciiConfig={DEFAULT_ASCII_TEXT_CONFIG}
      onAsciiConfigChange={jest.fn()}
      warpConfig={DEFAULT_WARP_TEXT_CONFIG}
      onWarpConfigChange={jest.fn()}
      strokeConfig={DEFAULT_STROKE_TEXT_CONFIG}
      onStrokeConfigChange={jest.fn()}
      paperTextureConfig={DEFAULT_PAPER_TEXTURE_CONFIG}
      onPaperTextureConfigChange={jest.fn()}
    />
  );
}

function openStackControls() {
  fireEvent.click(screen.getByTestId("stack-settings-toggle"));
}

test("stays out of the way behind a Settings button until asked for", () => {
  renderClosed();
  expect(screen.getByTestId("fan-debug-toggle")).toBeInTheDocument();
  expect(screen.queryByTestId("fan-debug-panel")).not.toBeInTheDocument();
});

test("opens the panel when Settings is clicked", () => {
  renderClosed();
  fireEvent.click(screen.getByTestId("fan-debug-toggle"));
  expect(screen.getByTestId("fan-debug-panel")).toBeInTheDocument();
  expect(screen.queryByTestId("fan-debug-toggle")).not.toBeInTheDocument();
});

test("keeps long stack controls collapsed in the narrow right-aligned panel", () => {
  renderPanel();
  expect(screen.getByTestId("stack-settings-toggle")).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByTestId("stack-settings")).not.toBeInTheDocument();
  expect(screen.getByTestId("fan-debug-panel")).toHaveClass("top-4", "right-4", "max-h-[calc(100dvh-2rem)]");
  expect(screen.getByTestId("fan-debug-panel")).toHaveStyle({ width: "320px" });
});

test("lets the user adjust the settings panel width", () => {
  renderPanel();
  fireEvent.change(screen.getByLabelText(/Panel width/i), { target: { value: "420" } });
  expect(screen.getByTestId("fan-debug-panel")).toHaveStyle({ width: "420px" });
});

test("starts on the ASCII text settings button and exposes its controls", () => {
  renderPanel();
  expect(screen.getByRole("tab", { name: "ASCII Text" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByTestId("ascii-text-settings")).toBeInTheDocument();
  expect(screen.getByLabelText(/ASCII glyph size/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Plane scale/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Cursor tilt/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/CRT curvature/i)).toBeInTheDocument();
});

test("uses the requested ASCII defaults", () => {
  expect(DEFAULT_ASCII_TEXT_CONFIG).toEqual({
    enableWaves: false,
    asciiFontSize: 11,
    textFontSize: 340,
    planeScale: 1,
    extrudeDepth: 0.06,
    tiltStrength: 0.3,
    crtCurvature: 0.32,
    randomizeGlyphColors: true,
    // The stage holds one colour so it matches the reference; only the glyph
    // cells vary.
    randomizeStageColor: false,
  });
});

test("updates the ASCII glyph size without changing the other ASCII settings", () => {
  const { onAsciiConfigChange } = renderPanel();
  fireEvent.change(screen.getByLabelText(/ASCII glyph size/i), { target: { value: "14" } });
  expect(onAsciiConfigChange).toHaveBeenCalledWith({ ...DEFAULT_ASCII_TEXT_CONFIG, asciiFontSize: 14 });
});

test("toggles ASCII waves", () => {
  const { onAsciiConfigChange } = renderPanel();
  fireEvent.click(screen.getByLabelText(/Enable waves/i));
  expect(onAsciiConfigChange).toHaveBeenCalledWith({ ...DEFAULT_ASCII_TEXT_CONFIG, enableWaves: true });
});

test("exposes independent random glyph and stage color controls", () => {
  const { onAsciiConfigChange } = renderPanel();
  fireEvent.click(screen.getByLabelText(/Random color chips/i));
  expect(onAsciiConfigChange).toHaveBeenCalledWith({ ...DEFAULT_ASCII_TEXT_CONFIG, randomizeGlyphColors: false });

  fireEvent.click(screen.getByLabelText(/Random stage color/i));
  expect(onAsciiConfigChange).toHaveBeenCalledWith({ ...DEFAULT_ASCII_TEXT_CONFIG, randomizeStageColor: true });
});

test("switches to the Warp Text button and exposes its controls", () => {
  renderPanel();
  fireEvent.click(screen.getByRole("tab", { name: "Warp Text" }));
  expect(screen.getByRole("tab", { name: "Warp Text" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByTestId("warp-text-settings")).toBeInTheDocument();
  expect(screen.queryByTestId("ascii-text-settings")).not.toBeInTheDocument();
  expect(screen.getByLabelText(/Pointer radius/i)).toBeInTheDocument();
});

test("updates Warp Text settings independently", () => {
  const { onWarpConfigChange } = renderPanel();
  fireEvent.click(screen.getByRole("tab", { name: "Warp Text" }));
  fireEvent.change(screen.getByLabelText(/^Warp strength/i), { target: { value: "0.31" } });
  expect(onWarpConfigChange).toHaveBeenCalledWith({ ...DEFAULT_WARP_TEXT_CONFIG, warpStrength: 0.31 });
});

test("switches to Stroke Text and exposes all of its animation controls", () => {
  renderPanel();
  fireEvent.click(screen.getByRole("tab", { name: "Stroke Text" }));
  expect(screen.getByTestId("stroke-text-settings")).toBeInTheDocument();
  expect(screen.getByLabelText(/Stroke color/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Draw duration/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Animation trigger/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Reverse draw/i)).toBeInTheDocument();
});

test("updates Stroke Text settings independently", () => {
  const { onStrokeConfigChange } = renderPanel();
  fireEvent.click(screen.getByRole("tab", { name: "Stroke Text" }));
  fireEvent.change(screen.getByLabelText(/Draw duration/i), { target: { value: "2.4" } });
  expect(onStrokeConfigChange).toHaveBeenCalledWith({ ...DEFAULT_STROKE_TEXT_CONFIG, drawDuration: 2.4 });
});

test("switches to Paper Texture and exposes the shader controls", () => {
  renderPanel();
  fireEvent.click(screen.getByRole("tab", { name: "Paper Texture" }));
  expect(screen.getByRole("tab", { name: "Paper Texture" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByTestId("paper-texture-settings")).toBeInTheDocument();
  expect(screen.getByLabelText(/Fibre size/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Fold count/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Texture seed/i)).toBeInTheDocument();
});

test("updates Paper Texture settings independently", () => {
  const { onPaperTextureConfigChange } = renderPanel();
  fireEvent.click(screen.getByRole("tab", { name: "Paper Texture" }));
  fireEvent.change(screen.getByLabelText(/^Roughness/i), { target: { value: "0.45" } });
  expect(onPaperTextureConfigChange).toHaveBeenCalledWith({
    ...DEFAULT_PAPER_TEXTURE_CONFIG,
    roughness: 0.45,
  });
});

test("closes again, leaving only the Settings button", () => {
  renderClosed();
  fireEvent.click(screen.getByTestId("fan-debug-toggle"));
  fireEvent.click(screen.getByTestId("fan-debug-close"));
  expect(screen.queryByTestId("fan-debug-panel")).not.toBeInTheDocument();
  expect(screen.getByTestId("fan-debug-toggle")).toBeInTheDocument();
});

test("does not show the retired stack mechanic buttons", () => {
  renderPanel();
  expect(screen.queryByText("Bottom Peek")).not.toBeInTheDocument();
  expect(screen.queryByText("Corner Cascade")).not.toBeInTheDocument();
});

test("moving a case study's band slider updates only that band", () => {
  const { onConfigChange } = renderPanel();
  openStackControls();
  fireEvent.change(screen.getByLabelText(/Case Two band/i), { target: { value: "10" } });
  expect(onConfigChange).toHaveBeenCalledWith({ ...config, bandPercents: [4, 10, 4] });
});

test("moving the emphasis bonus slider updates the config", () => {
  const { onConfigChange } = renderPanel();
  openStackControls();
  fireEvent.change(screen.getByLabelText(/Emphasis bonus/i), { target: { value: "14" } });
  expect(onConfigChange).toHaveBeenCalledWith({ ...config, emphasisBonusPercent: 14 });
});

test("moving the emphasis falloff slider updates the config", () => {
  const { onConfigChange } = renderPanel();
  openStackControls();
  fireEvent.change(screen.getByLabelText(/Emphasis falloff/i), { target: { value: "2.5" } });
  expect(onConfigChange).toHaveBeenCalledWith({ ...config, emphasisFalloff: 2.5 });
});

test("moving the brightness falloff slider updates the config", () => {
  const { onConfigChange } = renderPanel();
  openStackControls();
  fireEvent.change(screen.getByLabelText(/Brightness falloff/i), { target: { value: "0.1" } });
  expect(onConfigChange).toHaveBeenCalledWith({ ...config, brightnessFalloff: 0.1 });
});

test("moving the transition slider calls onTransitionMsChange", () => {
  const { onTransitionMsChange } = renderPanel();
  openStackControls();
  fireEvent.change(screen.getByLabelText(/Transition/i), { target: { value: "120" } });
  expect(onTransitionMsChange).toHaveBeenCalledWith(120);
});

test("moving the threshold slider calls onThresholdPxChange", () => {
  const { onThresholdPxChange } = renderPanel();
  openStackControls();
  fireEvent.change(screen.getByLabelText(/trigger threshold/i), { target: { value: "600" } });
  expect(onThresholdPxChange).toHaveBeenCalledWith(600);
});

test("moving the fan split slider calls onFanSplitChange", () => {
  const { onFanSplitChange } = renderPanel();
  openStackControls();
  fireEvent.change(screen.getByLabelText(/Fan\/sweep split/i), { target: { value: "0.6" } });
  expect(onFanSplitChange).toHaveBeenCalledWith(0.6);
});

test("moving the tilt slider updates the per-sheet tilt step", () => {
  const { onConfigChange } = renderPanel();
  openStackControls();
  fireEvent.change(screen.getByLabelText(/Tilt per sheet/i), { target: { value: "-3" } });
  expect(onConfigChange).toHaveBeenCalledWith({ ...config, tiltStepDegrees: -3 });
});

test("moving the smoothing slider calls onSmoothingMsChange", () => {
  const { onSmoothingMsChange } = renderPanel();
  openStackControls();
  fireEvent.change(screen.getByLabelText(/Smoothing/i), { target: { value: "160" } });
  expect(onSmoothingMsChange).toHaveBeenCalledWith(160);
});

test("moving the max tilt slider updates the cap", () => {
  const { onConfigChange } = renderPanel();
  openStackControls();
  fireEvent.change(screen.getByLabelText(/Max tilt/i), { target: { value: "4" } });
  expect(onConfigChange).toHaveBeenCalledWith({ ...config, maxTiltDegrees: 4 });
});

test("the plane scale defaults to an exact match with the original font", () => {
  // 1x means the ascii headline renders at the size the font itself would.
  expect(DEFAULT_ASCII_TEXT_CONFIG.planeScale).toBe(1);
});

test("exposes the plane scale and cursor tilt controls", () => {
  const { onAsciiConfigChange } = renderPanel();
  fireEvent.change(screen.getByLabelText(/Plane scale/i), { target: { value: "1.2" } });
  expect(onAsciiConfigChange).toHaveBeenCalledWith({ ...DEFAULT_ASCII_TEXT_CONFIG, planeScale: 1.2 });

  fireEvent.change(screen.getByLabelText(/Cursor tilt/i), { target: { value: "0.4" } });
  expect(onAsciiConfigChange).toHaveBeenCalledWith({ ...DEFAULT_ASCII_TEXT_CONFIG, tiltStrength: 0.4 });
});

test("exposes the stroke sketch style, defaulting to pencil", () => {
  const { onStrokeConfigChange } = renderPanel();
  fireEvent.click(screen.getByRole("tab", { name: "Stroke Text" }));
  const select = screen.getByLabelText(/Sketch style/i);
  expect(select).toHaveValue("pencil");

  fireEvent.change(select, { target: { value: "clean" } });
  expect(onStrokeConfigChange).toHaveBeenCalledWith({
    ...DEFAULT_STROKE_TEXT_CONFIG,
    sketchStyle: "clean",
  });
});
