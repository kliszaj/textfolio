import { render, screen } from "@testing-library/react";
import CaseStudyPage from "./page";
import { caseStudies } from "@/data/caseStudies";
import { ABOUT_PAGE } from "@/data/about";

const mockNotFound = jest.fn();
jest.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
  // CaseStudyView navigates home with its explicit home control.
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

test("renders the case study title and its overview for a known slug", async () => {
  const jsx = await CaseStudyPage({ params: Promise.resolve({ slug: caseStudies[0].slug }) });
  render(jsx as React.ReactElement);
  expect(screen.getByText(caseStudies[0].title)).toBeInTheDocument();
  // The rail leads with the overview once one is written; the blurb is the
  // fallback for a study that has none, and the home stack's subheading.
  expect(screen.getByText(caseStudies[0].overview!)).toBeInTheDocument();
});

test("sends the last case study's next arrow to About, not back to Jam", async () => {
  const last = caseStudies[caseStudies.length - 1];
  const jsx = await CaseStudyPage({ params: Promise.resolve({ slug: last.slug }) });
  render(jsx as React.ReactElement);
  const nextLink = screen.getByTestId("case-study-next");
  expect(nextLink).toHaveAttribute("href", "/about");
  expect(nextLink).toHaveStyle({ backgroundColor: ABOUT_PAGE.thumbnailColor });
});

test("points the header arrow at the next study, in its colour", async () => {
  const jsx = await CaseStudyPage({ params: Promise.resolve({ slug: caseStudies[0].slug }) });
  render(jsx as React.ReactElement);
  const nextLink = screen.getByTestId("case-study-next");
  expect(nextLink).toHaveAttribute("href", `/work/${caseStudies[1].slug}`);
  expect(nextLink).toHaveStyle({ backgroundColor: caseStudies[1].thumbnailColor });
});

test("calls notFound for an unknown slug", async () => {
  mockNotFound.mockClear();
  await CaseStudyPage({ params: Promise.resolve({ slug: "not-a-real-slug" }) });
  expect(mockNotFound).toHaveBeenCalled();
});
