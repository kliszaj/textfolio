import { render, screen, fireEvent } from "@testing-library/react";
import { CaseStudyPreview } from "./CaseStudyPreview";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const caseStudy = {
  slug: "test-case",
  title: "Test Case",
  thumbnailColor: "#ABCDEF",
  blurb: "A test blurb.",
};

test("always renders the title", () => {
  render(<CaseStudyPreview caseStudy={caseStudy} focused={false} />);
  expect(screen.getByText("Test Case")).toBeInTheDocument();
});

test("hides the blurb when not focused", () => {
  render(<CaseStudyPreview caseStudy={caseStudy} focused={false} />);
  expect(screen.queryByText("A test blurb.")).not.toBeInTheDocument();
});

test("shows the blurb when focused", () => {
  render(<CaseStudyPreview caseStudy={caseStudy} focused />);
  expect(screen.getByText("A test blurb.")).toBeInTheDocument();
});

test("clicking navigates to the case study route", () => {
  render(<CaseStudyPreview caseStudy={caseStudy} focused={false} />);
  fireEvent.click(screen.getByRole("button"));
  expect(mockPush).toHaveBeenCalledWith("/work/test-case");
});
