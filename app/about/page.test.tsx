import { render, screen } from "@testing-library/react";
import AboutPage from "./page";
import { caseStudies } from "@/data/caseStudies";
import { ABOUT_PAGE } from "@/data/about";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

test("renders the About page's title and overview", () => {
  render(<AboutPage />);
  expect(screen.getByText(ABOUT_PAGE.title)).toBeInTheDocument();
  expect(screen.getByText(ABOUT_PAGE.overview!)).toBeInTheDocument();
});

test("closes the loop: About's next arrow leads back to the first case study", () => {
  render(<AboutPage />);
  const nextLink = screen.getByTestId("case-study-next");
  expect(nextLink).toHaveAttribute("href", `/work/${caseStudies[0].slug}`);
  expect(nextLink).toHaveStyle({ backgroundColor: caseStudies[0].thumbnailColor });
});
