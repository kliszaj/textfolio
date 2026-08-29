import { render, screen } from "@testing-library/react";
import CaseStudyPage from "./page";
import { caseStudies } from "@/data/caseStudies";

const mockNotFound = jest.fn();
jest.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
}));

test("renders the case study title and blurb for a known slug", async () => {
  const jsx = await CaseStudyPage({ params: Promise.resolve({ slug: caseStudies[0].slug }) });
  render(jsx as React.ReactElement);
  expect(screen.getByText(caseStudies[0].title)).toBeInTheDocument();
  expect(screen.getByText(caseStudies[0].blurb)).toBeInTheDocument();
});

test("calls notFound for an unknown slug", async () => {
  mockNotFound.mockClear();
  await CaseStudyPage({ params: Promise.resolve({ slug: "not-a-real-slug" }) });
  expect(mockNotFound).toHaveBeenCalled();
});
