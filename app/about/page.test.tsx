import { render, screen, within } from "@testing-library/react";
import AboutPage from "./page";
import { caseStudies } from "@/data/caseStudies";
import { ABOUT_NOW, ABOUT_PAGE } from "@/data/about";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

test("opens on a profile: portrait, name, role, and the ways to get in touch", () => {
  render(<AboutPage />);
  expect(screen.getByTestId("case-study-header")).toHaveTextContent(ABOUT_PAGE.title);
  const profile = within(screen.getByTestId("case-study-profile"));
  expect(profile.getByText("adrian klisz")).toBeInTheDocument();
  expect(profile.getByText("Staff Product Designer · Stockholm")).toBeInTheDocument();
  expect(profile.getByRole("link", { name: "hello@adrianklisz.com" })).toHaveAttribute("href", "mailto:hello@adrianklisz.com");
  expect(profile.getByRole("link", { name: /LinkedIn/ })).toHaveAttribute("href", "https://www.linkedin.com/in/adrianklisz/");
  // The portrait shows once, here, not again in the Now shelf.
  expect(screen.getAllByRole("img", { name: "Portrait of Adrian" })).toHaveLength(1);
  expect(profile.getByRole("img", { name: "Portrait of Adrian" })).toBeInTheDocument();
  expect(screen.queryByTestId("about-now-portrait")).not.toBeInTheDocument();
  // The bio follows.
  expect(screen.getByText(/I'm Adrian, a Staff Product Designer currently working at Spotify/)).toBeInTheDocument();
});

test("uses Adrian's supplied book-cover art", () => {
  expect(ABOUT_NOW.books[0].coverSrc).toBe(
    "https://m.media-amazon.com/images/I/71aYLQxV4tL._SL1500_.jpg"
  );
  expect(ABOUT_NOW.books[1].coverSrc).toBe(
    "https://www.studentapan.se/images/format:webp/size:640:0/quality:100/asset/book-cover/mina-vanner-9789113143804"
  );
});

test("closes the loop: About's next arrow leads back to the first case study", () => {
  render(<AboutPage />);
  const nextLink = screen.getByTestId("case-study-next");
  expect(nextLink).toHaveAttribute("href", `/work/${caseStudies[0].slug}`);
  expect(nextLink).toHaveStyle({ backgroundColor: caseStudies[0].thumbnailColor });
});

test("keeps the Now section inside the animated page surface", () => {
  render(<AboutPage />);

  expect(screen.getByTestId("case-study-view")).toContainElement(
    screen.getByRole("heading", { name: "Now" })
  );
});
