import { fireEvent, render, screen } from "@testing-library/react";
import { CaseStudyTuning, tuningCss } from "./CaseStudyTuning";

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("style");
});

test("prints the values as lines for globals.css", () => {
  expect(tuningCss({ heightVh: 30, ratio: 2.4, maxRem: 8 })).toBe(
    "  --case-study-header-height: 30vh;\n  --case-study-title-ratio: 2.4;\n  --case-study-title-max: 8rem;"
  );
});

test("a saved tuning is applied to the page on load", () => {
  localStorage.setItem("textfolio:case-study-header-v1", JSON.stringify({ heightVh: 31, ratio: 2.2, maxRem: 7 }));
  render(<CaseStudyTuning />);
  const style = document.documentElement.style;
  expect(style.getPropertyValue("--case-study-header-height")).toBe("31vh");
  expect(style.getPropertyValue("--case-study-title-ratio")).toBe("2.2");
  expect(style.getPropertyValue("--case-study-title-max")).toBe("7rem");
});

test("moving a slider overrides the CSS, and Reset hands it back", () => {
  render(<CaseStudyTuning />);
  fireEvent.click(screen.getByRole("button", { name: "Header" }));
  fireEvent.change(screen.getByRole("slider", { name: /Header height/ }), { target: { value: "33" } });
  expect(document.documentElement.style.getPropertyValue("--case-study-header-height")).toBe("33vh");
  expect(localStorage.getItem("textfolio:case-study-header-v1")).toContain('"heightVh":33');
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect(document.documentElement.style.getPropertyValue("--case-study-header-height")).toBe("");
  expect(localStorage.getItem("textfolio:case-study-header-v1")).toBeNull();
});
