import { act, fireEvent, render, screen } from "@testing-library/react";
import { AboutShelf } from "./AboutShelf";

const shelf = {
  books: [
    { title: "Loonshots", author: "Safi Bahcall", href: "https://www.bahcall.com/book/", coverSrc: "https://example.com/loonshots.jpg", note: "About crazy ideas.", spine: "#efe7d6", spineText: "#1c1c1c" },
    { title: "Mina vänner", author: "Fredrik Backman", href: "https://example.com/mina", coverSrc: "https://example.com/mina.jpg", note: "A novel.", spine: "#2f5d8a", spineText: "#fff" },
  ],
  playlist: { title: "sept '26", href: "https://open.spotify.com/playlist/x", coverSrc: "/assets/cover.jpg", embedSrc: "https://open.spotify.com/embed/playlist/x", note: "This month." },
  game: { title: "Magic: The Gathering", note: "A card game.", commander: "Slimefoot and Squee", cardSrc: "/assets/card.jpg", deckHref: "https://moxfield.com/decks/x" },
};

test("puts the books, the record and the deck box on the shelf, with no Now title", () => {
  render(<AboutShelf shelf={shelf} />);
  expect(screen.queryByRole("heading", { name: "Now" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Loonshots by Safi Bahcall" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Mina vänner by Fredrik Backman" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "sept '26, a playlist" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Magic: The Gathering" })).toBeInTheDocument();
});

test("the deck box only stands there while a game is set", () => {
  render(<AboutShelf shelf={{ ...shelf, game: undefined }} />);
  expect(screen.queryByRole("button", { name: "Magic: The Gathering" })).not.toBeInTheDocument();
});

test("picking something up names it, with its link, and picking it again puts it back", () => {
  render(<AboutShelf shelf={shelf} />);
  const book = screen.getByRole("button", { name: "Loonshots by Safi Bahcall" });
  fireEvent.click(book);
  expect(book).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("link", { name: /About the book/ })).toHaveAttribute("href", "https://www.bahcall.com/book/");
  expect(screen.getByText("by Safi Bahcall")).toBeInTheDocument();
  expect(screen.getByText("About crazy ideas.")).toBeInTheDocument();

  const record = screen.getByRole("button", { name: "sept '26, a playlist" });
  fireEvent.click(record);
  expect(book).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("link", { name: /Open in Spotify/ })).toHaveAttribute("href", "https://open.spotify.com/playlist/x");

  fireEvent.click(record);
  expect(record).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByText("Things I'm into")).toBeInTheDocument();
});

test("Escape puts a picked thing back", () => {
  render(<AboutShelf shelf={shelf} />);
  const deck = screen.getByRole("button", { name: "Magic: The Gathering" });
  fireEvent.click(deck);
  expect(deck).toHaveAttribute("aria-pressed", "true");
  act(() => { fireEvent.keyDown(window, { key: "Escape" }); });
  expect(deck).toHaveAttribute("aria-pressed", "false");
});

test("the record's sleeve shows the playlist cover, and picked up, the player opens after the vinyl", () => {
  jest.useFakeTimers();
  const { container } = render(<AboutShelf shelf={shelf} />);
  expect(container.querySelector(".shelf-sleeve-art")).toHaveStyle({ backgroundImage: "url(/assets/cover.jpg)" });
  expect(screen.queryByTitle("sept '26 on Spotify")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "sept '26, a playlist" }));
  // Not straight away: the vinyl slides out first.
  expect(screen.queryByTitle("sept '26 on Spotify")).not.toBeInTheDocument();
  act(() => { jest.advanceTimersByTime(700); });
  expect(screen.getByTitle("sept '26 on Spotify")).toHaveAttribute("src", "https://open.spotify.com/embed/playlist/x");

  // Put back, the player goes with it.
  fireEvent.click(screen.getByRole("button", { name: "sept '26, a playlist" }));
  expect(screen.queryByTitle("sept '26 on Spotify")).not.toBeInTheDocument();
  jest.useRealTimers();
});

test("the deck has the commander's card face up on top, and picked up it links to the deck", () => {
  const { container } = render(<AboutShelf shelf={shelf} />);
  expect(container.querySelector(".shelf-topcard")).toHaveStyle({ backgroundImage: "url(/assets/card.jpg)" });
  fireEvent.click(screen.getByRole("button", { name: "Magic: The Gathering" }));
  expect(screen.getByText("A card game.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /See the deck/ })).toHaveAttribute("href", "https://moxfield.com/decks/x");
});
