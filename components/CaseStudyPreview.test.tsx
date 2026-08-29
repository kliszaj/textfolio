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

test("renders the case study title and blurb", () => {
  render(<CaseStudyPreview caseStudy={caseStudy} />);
  expect(screen.getByText("Test Case")).toBeInTheDocument();
  expect(screen.getByText("A test blurb.")).toBeInTheDocument();
});

test("clicking navigates to the case study route", () => {
  render(<CaseStudyPreview caseStudy={caseStudy} />);
  fireEvent.click(screen.getByRole("button"));
  expect(mockPush).toHaveBeenCalledWith("/work/test-case");
});
