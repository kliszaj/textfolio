import { getLinkPreview } from "./linkPreviews";

test("returns the real, fetched preview for a known link", () => {
  const preview = getLinkPreview({
    label: "proactive nudging",
    href: "https://en.wikipedia.org/wiki/Nudge_theory",
  });
  expect(preview.source).toBe("Wikipedia");
  expect(preview.title).toBe("Nudge theory");
  expect(preview.description).toContain("behavioral economics");
  // Wikipedia's own summary API returned no thumbnail for this article --
  // the field is simply absent, not a broken/empty string.
  expect(preview.image).toBeUndefined();
});

test("carries a real preview image for a link that has one", () => {
  const preview = getLinkPreview({
    label: "TechCrunch on Focals by North",
    href: "https://www.youtube.com/watch?v=5eO-Y36_t08",
  });
  expect(preview.image).toBe("https://i.ytimg.com/vi/5eO-Y36_t08/maxresdefault.jpg");
});

test("falls back to the link's own label and hostname for an unknown href", () => {
  const preview = getLinkPreview({
    label: "some other site",
    href: "https://example.com/whatever",
  });
  expect(preview.source).toBe("example.com");
  expect(preview.title).toBe("some other site");
  expect(preview.image).toBeUndefined();
});

test("labels an unknown internal link with the site's own name, not a hostname", () => {
  const preview = getLinkPreview({ label: "a page", href: "/some/internal/page" });
  expect(preview.source).toBe("Adrian Klisz");
});
