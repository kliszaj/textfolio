import type { CaseStudyOverviewLink } from "@/data/caseStudies";

export type LinkPreview = {
  source: string;
  title: string;
  description: string;
  color: string;
  // The destination's own real preview image, when it has one -- not every
  // page does (Wikipedia's summary API returns none for this article), and
  // an internal archive page has no reason to carry an external photo.
  image?: string;
};

// Every entry below is the destination's own real title/description/image --
// fetched from the page itself (Wikipedia's summary API, or the page's own
// og: tags), not hand-typed guesses. Re-fetch and update by hand if a link
// changes; there's no build-time automation for this, deliberately: five
// links, checked once, is simpler than a fetch step that could go stale or
// fail silently.
const LINK_PREVIEWS: Record<string, LinkPreview> = {
  "https://en.wikipedia.org/wiki/Nudge_theory": {
    source: "Wikipedia",
    title: "Nudge theory",
    description: "Concept in behavioral economics, political theory and behavioral sciences.",
    color: "#DDE7F3",
  },
  "https://newsroom.spotify.com/2026-05-21/investor-day-recap/": {
    source: "Spotify Newsroom",
    title: "Spotify’s 2026 Investor Day Recap",
    description: "Raising ambition for the next era of media.",
    color: "#15FF76",
    image: "https://storage.googleapis.com/pr-newsroom-wp/1/2026/05/Spotify-Investor-Day-logo.jpeg",
  },
  "/archive/2019/pmf.html": {
    source: "Adrian Klisz — archive",
    title: "Focals product-market-fit archive",
    description:
      "A new design process to help us build, release, and learn more quickly -- restored from the 2019 site.",
    color: "#FFA52E",
  },
  "https://www.wired.com/review/focals-by-north-smart-glasses/": {
    source: "WIRED",
    title: "Wearing Focals Made Me Rethink Smart Glasses",
    description: "Peer through these custom-fitted smart glasses and you can almost see the future.",
    color: "#E7DDD2",
    image: "https://media.wired.com/photos/5c4fe2814e153f2c5531fa1b/191:100/w_1280,c_limit/Gear-Focal-web.jpg",
  },
  "https://www.youtube.com/watch?v=5eO-Y36_t08": {
    source: "YouTube",
    title: "Review: Focals by North smart glasses",
    description: "These smart glasses look great and work just fine, but probably aren’t for everybody.",
    color: "#F1D9D5",
    image: "https://i.ytimg.com/vi/5eO-Y36_t08/maxresdefault.jpg",
  },
};

function fallbackSource(href: string) {
  if (href.startsWith("/")) return "Adrian Klisz";

  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return "Linked page";
  }
}

export function getLinkPreview(link: CaseStudyOverviewLink): LinkPreview {
  return (
    LINK_PREVIEWS[link.href] ?? {
      source: fallbackSource(link.href),
      title: link.label,
      description: "Open the linked page for more context.",
      color: "#E7DDD2",
    }
  );
}
