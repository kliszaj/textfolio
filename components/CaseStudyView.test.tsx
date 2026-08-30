import { render, screen } from "@testing-library/react";
import { CaseStudyView } from "./CaseStudyView";

const caseStudy = {
  slug: "test-case",
  title: "Test Case",
  thumbnailColor: "#15FF76",
  blurb: "A test blurb.",
};

const withVideo = { ...caseStudy, videoSrc: "/assets/jam.mp4" };

test("puts the title and blurb in the header", () => {
  render(<CaseStudyView caseStudy={caseStudy} />);
  const header = screen.getByTestId("case-study-header");
  expect(header).toContainElement(screen.getByText("Test Case"));
  expect(header).toContainElement(screen.getByText("A test blurb."));
});

test("carries the case study's colour through into the header", () => {
  render(<CaseStudyView caseStudy={caseStudy} />);
  expect(screen.getByTestId("case-study-header")).toHaveStyle({
    backgroundColor: "#15FF76",
  });
});

test("leaves the body on the homepage cream rather than the case study colour", () => {
  render(<CaseStudyView caseStudy={caseStudy} />);
  const view = screen.getByTestId("case-study-view");
  expect(view).toHaveClass("bg-cream");
  expect(screen.getByTestId("case-study-body")).not.toHaveStyle({
    backgroundColor: "#15FF76",
  });
});

test("settles the header down from full bleed so the lift's colour contracts", () => {
  render(<CaseStudyView caseStudy={caseStudy} />);
  expect(screen.getByTestId("case-study-header")).toHaveClass("case-study-header");
});

test("bottom-aligns the header content to match where the lift left it", () => {
  render(<CaseStudyView caseStudy={caseStudy} />);
  expect(screen.getByTestId("case-study-header")).toHaveClass("justify-end", "p-12");
});

test("shows the case study's video as soon as the page opens", () => {
  render(<CaseStudyView caseStudy={withVideo} />);
  const video = screen.getByTestId("case-study-video");
  expect(video).toHaveAttribute("src", "/assets/jam.mp4");
  expect(video).toHaveAttribute("autoplay");
  expect(video).toHaveAttribute("loop");
});

test("shows that video exactly once", () => {
  render(<CaseStudyView caseStudy={withVideo} />);
  expect(screen.getAllByTestId("case-study-video")).toHaveLength(1);
});

test("renders no video for a case study that has none", () => {
  render(<CaseStudyView caseStudy={caseStudy} />);
  expect(screen.queryByTestId("case-study-video")).not.toBeInTheDocument();
});

test("centres the video in the body", () => {
  render(<CaseStudyView caseStudy={withVideo} />);
  expect(screen.getByTestId("case-study-video")).toHaveClass("mx-auto");
});
