import { render, screen } from "@testing-library/react";
import AboutPage from "./page";
import { caseStudies } from "@/data/caseStudies";
import { ABOUT_NOW, ABOUT_PAGE } from "@/data/about";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

test("keeps the biography free of a redundant header or a repeated portrait", () => {
  render(<AboutPage />);
  expect(screen.getByText(ABOUT_PAGE.title)).toBeInTheDocument();
  expect(
    screen.getByText(/I'm Adrian, a Staff Product Designer currently working at Spotify/)
  ).toBeInTheDocument();
  // The portrait now lives once, in the Now bento below -- not at the top
  // of the write-up's own rail (see the AboutNow test for that).
  expect(screen.getAllByRole("img", { name: "Portrait of Adrian" })).toHaveLength(1);
  expect(screen.queryByTestId("case-study-intro-image")).not.toBeInTheDocument();
  // Based in / From aren't their own facts any more -- the bio already
  // says both, so the dedicated rail (and its now-unused space) is gone.
  expect(screen.queryByTestId("case-study-overview")).not.toBeInTheDocument();
  expect(screen.getByText(/originally from Canada/)).toBeInTheDocument();
  // Contact links moved to the bottom of the text block instead.
  expect(screen.getByRole("link", { name: "hello@adrianklisz.com" })).toHaveAttribute(
    "href",
    "mailto:hello@adrianklisz.com"
  );
  expect(screen.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
    "href",
    "https://www.linkedin.com/in/adrianklisz/"
  );
  expect(screen.queryByText("Currently")).not.toBeInTheDocument();
  expect(
    screen.queryByText("A Staff Product Designer at Spotify, based in Stockholm and originally from Canada.")
  ).not.toBeInTheDocument();
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
