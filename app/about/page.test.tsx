import { render, screen, within } from "@testing-library/react";
import AboutPage from "./page";
import { caseStudies } from "@/data/caseStudies";
import { ABOUT_PAGE, ABOUT_SHELF } from "@/data/about";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

test("opens on the portrait beside the bio, with the ways to get in touch under it", () => {
  render(<AboutPage />);
  expect(screen.getByTestId("case-study-header")).toHaveTextContent(ABOUT_PAGE.title);
  const profile = within(screen.getByTestId("case-study-profile"));
  expect(screen.getAllByRole("img", { name: "Portrait of Adrian" })).toHaveLength(1);
  expect(profile.getByRole("img", { name: "Portrait of Adrian" })).toBeInTheDocument();
  // The whole bio, once, a paragraph at a time.
  expect(profile.getAllByText(/^I'm Adrian, designer from Toronto/)).toHaveLength(1);
  expect(profile.getByText(/^Whatever I do, I approach it with an innate curiosity/)).toBeInTheDocument();
  expect(screen.getAllByText(/I'm Adrian, designer from Toronto/)).toHaveLength(1);
  expect(profile.getByRole("link", { name: "hello@adrianklisz.com" })).toHaveAttribute("href", "mailto:hello@adrianklisz.com");
  expect(profile.getByRole("link", { name: /LinkedIn/ })).toHaveAttribute("href", "https://www.linkedin.com/in/adrianklisz/");
  expect(profile.getByRole("link", { name: /CV/ })).toHaveAttribute("href", "/adrian-klisz-cv.pdf");
});

test("the footer's links include GitHub", () => {
  render(<AboutPage />);
  const footer = within(screen.getByTestId("case-study-footer"));
  expect(footer.getByText("Find me")).toBeInTheDocument();
  expect(footer.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", "https://github.com/kliszaj");
});

test("uses Adrian's supplied book-cover art", () => {
  expect(ABOUT_SHELF.books[0].coverSrc).toBe(
    "https://m.media-amazon.com/images/I/71aYLQxV4tL._SL1500_.jpg"
  );
  expect(ABOUT_SHELF.books[1].coverSrc).toBe(
    "https://www.studentapan.se/images/format:webp/size:640:0/quality:100/asset/book-cover/mina-vanner-9789113143804"
  );
});

test("closes the loop: About's next arrow leads back to the first case study", () => {
  render(<AboutPage />);
  const nextLink = screen.getByTestId("case-study-next");
  expect(nextLink).toHaveAttribute("href", `/work/${caseStudies[0].slug}`);
  expect(nextLink).toHaveStyle({ backgroundColor: caseStudies[0].thumbnailColor });
});

test("keeps the shelf inside the animated page surface", () => {
  render(<AboutPage />);

  expect(screen.getByTestId("case-study-view")).toContainElement(
    screen.getByRole("heading", { name: "On my shelf" })
  );
});
