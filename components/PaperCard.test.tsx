import { render, screen, fireEvent } from "@testing-library/react";
import { PaperCard } from "./PaperCard";

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
  render(<PaperCard caseStudy={caseStudy} transform={{ x: 0, y: 0, rotate: 0 }} zIndex={0} />);
  expect(screen.getByText("Test Case")).toBeInTheDocument();
  expect(screen.getByText("A test blurb.")).toBeInTheDocument();
});

test("clicking navigates to the case study route", () => {
  render(<PaperCard caseStudy={caseStudy} transform={{ x: 0, y: 0, rotate: 0 }} zIndex={0} />);
  fireEvent.click(screen.getByRole("button"));
  expect(mockPush).toHaveBeenCalledWith("/work/test-case");
});
