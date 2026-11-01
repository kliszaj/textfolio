import { fireEvent, render, screen, within } from "@testing-library/react";
import AboutPage from "./page";
import { caseStudies } from "@/data/caseStudies";
import { ABOUT_BENTO, ABOUT_PAGE } from "@/data/about";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

test("reads like a case study: a big opening line, then emailing and the CV beside the bio", () => {
  render(<AboutPage />);
  expect(screen.getByTestId("case-study-header")).toHaveTextContent(ABOUT_PAGE.title);
  const detail = within(screen.getByTestId("case-study-detail"));
  expect(detail.getByText(/^I’m Adrian, a designer from Canada/)).toHaveClass("case-study-lead");
  expect(detail.getByText(/^Whatever I do, I approach it with an innate curiosity/)).toBeInTheDocument();
  const actions = within(screen.getByTestId("case-study-actions"));
  expect(actions.getByText("Email me")).toBeInTheDocument();
  expect(actions.getByRole("link", { name: "hello@adrianklisz.com" })).toHaveAttribute("href", "mailto:hello@adrianklisz.com");
  const cv = actions.getByRole("link", { name: "Download My CV" });
  expect(cv).toHaveAttribute("href", "/adrian-klisz-cv.pdf");
  expect(cv).toHaveAttribute("download");
});

test("shows the portrait, Spotify's player for the playlist and the books as one row of tiles", () => {
  render(<AboutPage />);
  expect(screen.getAllByRole("img", { name: "Portrait of Adrian" })).toHaveLength(1);
  expect(screen.getByTitle("On Rotation on Spotify")).toHaveAttribute("src", ABOUT_BENTO.playlist.embedSrc);
  expect(within(screen.getByTestId("about-bento-reading")).getByText("Currently reading")).toBeInTheDocument();
});

test("with a book out, a click anywhere on the books puts it back rather than picking another", () => {
  render(<AboutPage />);
  const reading = within(screen.getByTestId("about-bento-reading"));
  const [first, second] = ABOUT_BENTO.reading.books;
  const book = reading.getByRole("button", { name: `${first.title} by ${first.author}` });
  fireEvent.click(book);
  expect(book).toHaveAttribute("aria-pressed", "true");
  // A pointer click (detail 1) on the scene, wherever it lands.
  fireEvent.click(reading.getByRole("button", { name: `${second.title} by ${second.author}` }), { detail: 1 });
  expect(book).toHaveAttribute("aria-pressed", "false");
  expect(reading.getByRole("button", { name: `${second.title} by ${second.author}` })).toHaveAttribute("aria-pressed", "false");
  expect(reading.getByText("Currently reading")).toBeInTheDocument();
});

test("picking a book lifts it and says what it is, and picking it again puts it back", () => {
  render(<AboutPage />);
  const reading = within(screen.getByTestId("about-bento-reading"));
  const [first] = ABOUT_BENTO.reading.books;
  const book = reading.getByRole("button", { name: `${first.title} by ${first.author}` });
  fireEvent.click(book);
  expect(book).toHaveAttribute("aria-pressed", "true");
  expect(reading.getByText(first.note, { exact: false })).toBeInTheDocument();
  expect(reading.getByRole("link", { name: /More/ })).toHaveAttribute("href", first.href);
  expect(reading.queryByText("Currently reading")).not.toBeInTheDocument();
  fireEvent.click(book);
  expect(book).toHaveAttribute("aria-pressed", "false");
  expect(reading.getByText("Currently reading")).toBeInTheDocument();
});

test("the footer's links include GitHub", () => {
  render(<AboutPage />);
  const footer = within(screen.getByTestId("case-study-footer"));
  expect(footer.getByText("Find me")).toBeInTheDocument();
  expect(footer.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", "https://github.com/kliszaj");
});

test("uses Adrian's supplied book-cover art", () => {
  expect(ABOUT_BENTO.reading.books[0].coverSrc).toBe(
    "https://m.media-amazon.com/images/I/71aYLQxV4tL._SL1500_.jpg"
  );
  expect(ABOUT_BENTO.reading.books[1].coverSrc).toBe(
    "https://www.studentapan.se/images/format:webp/size:640:0/quality:100/asset/book-cover/mina-vanner-9789113143804"
  );
});

test("closes the loop: About's next arrow leads back to the first case study", () => {
  render(<AboutPage />);
  const nextLink = screen.getByTestId("case-study-next");
  expect(nextLink).toHaveAttribute("href", `/work/${caseStudies[0].slug}`);
  expect(nextLink).toHaveStyle({ backgroundColor: caseStudies[0].thumbnailColor });
});

test("keeps the tiles inside the animated page surface", () => {
  render(<AboutPage />);
  expect(screen.getByTestId("case-study-view")).toContainElement(screen.getByTestId("about-bento-playlist"));
});
