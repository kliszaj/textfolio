import { render, screen } from "@testing-library/react";
import { AboutNow } from "./AboutNow";

const now = {
  books: [
    {
      title: "Loonshots",
      author: "Safi Bahcall",
      href: "https://www.bahcall.com/book/",
      coverSrc: "https://example.com/loonshots.jpg",
    },
    {
      title: "Mina vänner",
      author: "Fredrik Backman",
      href: "https://www.norstedts.se/bok/9789113143835/mina-vanner-v618798",
      coverSrc: "https://example.com/mina-vanner.jpg",
    },
  ],
  playlist: {
    title: "sept '26",
    href: "https://open.spotify.com/playlist/6Elc9EJreVRGJnM38lOE1E",
    embedSrc: "https://open.spotify.com/embed/playlist/6Elc9EJreVRGJnM38lOE1E",
  },
};

test("shows current books as linked covers and embeds the current playlist", () => {
  render(<AboutNow now={now} />);

  expect(screen.getByRole("heading", { name: "Now" })).toBeInTheDocument();
  expect(screen.getByText("Currently reading")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Loonshots by Safi Bahcall/i })).toHaveAttribute(
    "href",
    now.books[0].href
  );
  expect(screen.getByRole("link", { name: /Loonshots by Safi Bahcall/i })).toHaveClass(
    "w-[clamp(9.75rem,21vw,16.5rem)]"
  );
  expect(screen.getByRole("link", { name: /Mina vänner by Fredrik Backman/i })).toHaveAttribute(
    "href",
    now.books[1].href
  );
  const playlist = screen.getByTitle("sept '26 on Spotify");
  expect(playlist).toHaveAttribute("src", now.playlist.embedSrc);
  expect(playlist).toHaveClass("h-[352px]");
});
