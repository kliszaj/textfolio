import { render, screen, fireEvent } from "@testing-library/react";
import { CaseStudyPreview } from "./CaseStudyPreview";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
  mockPush.mockClear();
});

const caseStudy = {
  slug: "test-case",
  title: "Test Case",
  thumbnailColor: "#ABCDEF",
  blurb: "A test blurb.",
};

test("always renders the title", () => {
  render(<CaseStudyPreview caseStudy={caseStudy} emphasis={0} />);
  expect(screen.getByText("Test Case")).toBeInTheDocument();
});

test("keeps the blurb mounted but fully transparent with no emphasis", () => {
  render(<CaseStudyPreview caseStudy={caseStudy} emphasis={0} />);
  expect(screen.getByText("A test blurb.")).toHaveStyle({ opacity: "0" });
});

test("holds the blurb hidden until emphasis clears the ramp's start", () => {
  render(<CaseStudyPreview caseStudy={caseStudy} emphasis={0.35} />);
  expect(screen.getByText("A test blurb.")).toHaveStyle({ opacity: "0" });
});

test("fades the blurb in partway through the ramp", () => {
  render(<CaseStudyPreview caseStudy={caseStudy} emphasis={0.55} />);
  const opacity = parseFloat(screen.getByText("A test blurb.").style.opacity);
  expect(opacity).toBeCloseTo(0.5, 2);
});

test("shows the blurb fully at peak emphasis", () => {
  render(<CaseStudyPreview caseStudy={caseStudy} emphasis={1} />);
  expect(screen.getByText("A test blurb.")).toHaveStyle({ opacity: "1" });
});

test("clicking navigates to the case study route", () => {
  render(<CaseStudyPreview caseStudy={caseStudy} emphasis={0} />);
  fireEvent.click(screen.getByRole("button"));
  expect(mockPush).toHaveBeenCalledWith("/work/test-case");
});

test("hands the click to onSelect instead of navigating when one is given", () => {
  const onSelect = jest.fn();
  render(<CaseStudyPreview caseStudy={caseStudy} emphasis={0} onSelect={onSelect} />);
  fireEvent.click(screen.getByRole("button"));
  expect(onSelect).toHaveBeenCalledWith(caseStudy);
  expect(mockPush).not.toHaveBeenCalled();
});
