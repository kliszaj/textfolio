import { render, screen, fireEvent } from "@testing-library/react";
import { CaseStudyFocus } from "./CaseStudyFocus";
import { FOCUS_VARIANTS, getFocusVariant } from "@/lib/focusVariants";

const caseStudy = {
  slug: "test-case",
  title: "Test Case",
  thumbnailColor: "#15FF76",
  blurb: "A test blurb.",
};

const origin = { xPercent: 40, yPercent: 70 };

function renderFocus(variantId = "lift", onClose = jest.fn()) {
  render(
    <CaseStudyFocus
      caseStudy={caseStudy}
      variantId={variantId}
      origin={origin}
      onClose={onClose}
    />
  );
  return onClose;
}

test("shows the case study it was opened for", () => {
  renderFocus();
  expect(screen.getByText("Test Case")).toBeInTheDocument();
  expect(screen.getByText("A test blurb.")).toBeInTheDocument();
});

test("paints itself in that case study's colour", () => {
  renderFocus();
  expect(screen.getByTestId("case-study-focus")).toHaveStyle({
    backgroundColor: "#15FF76",
  });
});

test.each(FOCUS_VARIANTS.map((v) => v.id))("applies the %s variant's animation", (id) => {
  renderFocus(id);
  const overlay = screen.getByTestId("case-study-focus");
  expect(overlay).toHaveClass(getFocusVariant(id).className);
  expect(overlay.style.getPropertyValue("--focus-duration")).toBe(
    `${getFocusVariant(id).durationMs}ms`
  );
});

test("passes the click point through for the flood origin", () => {
  renderFocus("flood");
  const overlay = screen.getByTestId("case-study-focus");
  expect(overlay.style.getPropertyValue("--focus-x")).toBe("40%");
  expect(overlay.style.getPropertyValue("--focus-y")).toBe("70%");
});

test("closes on the close button", () => {
  const onClose = renderFocus();
  fireEvent.click(screen.getByTestId("case-study-focus-close"));
  expect(onClose).toHaveBeenCalled();
});

test("closes on Escape", () => {
  const onClose = renderFocus();
  fireEvent.keyDown(window, { key: "Escape" });
  expect(onClose).toHaveBeenCalled();
});

test("announces itself as a modal dialog", () => {
  renderFocus();
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(dialog).toHaveAccessibleName("Test Case");
});
