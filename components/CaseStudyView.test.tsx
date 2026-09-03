import { act, fireEvent, render, screen } from "@testing-library/react";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, prefetch: jest.fn() }),
}));

beforeEach(() => {
  push.mockClear();
  window.scrollY = 0;
});

import { CaseStudyView } from "./CaseStudyView";

const caseStudy = {
  slug: "test-case",
  title: "Test Case",
  thumbnailColor: "#15FF76",
  blurb: "A test blurb.",
};

const nextStudy = {
  slug: "next-case",
  title: "Next Case",
  thumbnailColor: "#F850C0",
  blurb: "The next one.",
};

const withVideo = { ...caseStudy, videoSrc: "/assets/jam.mp4" };

test("puts the title in the header and the blurb at the head of the reading column", () => {
  render(<CaseStudyView caseStudy={caseStudy} />);
  expect(screen.getByTestId("case-study-header")).toContainElement(
    screen.getByText("Test Case")
  );
  // The header carries the project name and controls. The framing sentence
  // is its own grid item -- not nested in case-study-detail -- specifically
  // so it can reorder ahead of the facts rail on narrow screens; it belongs
  // with the reading column's content either way, not the header or the rail.
  expect(screen.getByTestId("case-study-columns")).toContainElement(
    screen.getByText("A test blurb.")
  );
  expect(screen.getByTestId("case-study-overview")).not.toContainElement(
    screen.getByText("A test blurb.")
  );
});

test("carries the case study's colour through into the header", () => {
  render(<CaseStudyView caseStudy={caseStudy} />);
  expect(screen.getByTestId("case-study-header")).toHaveStyle({
    backgroundColor: "#15FF76",
  });
});

test("leaves the body on the homepage cream rather than the case study colour", () => {
  render(<CaseStudyView caseStudy={caseStudy} />);
  const view = screen.getByTestId("case-study-view");
  expect(view).toHaveClass("bg-cream");
  expect(screen.getByTestId("case-study-body")).not.toHaveStyle({
    backgroundColor: "#15FF76",
  });
});

test("settles the header down from full bleed so the lift's colour contracts", () => {
  render(<CaseStudyView caseStudy={caseStudy} />);
  expect(screen.getByTestId("case-study-header")).toHaveClass("case-study-header");
});

test("bottom-aligns the header content to match where the lift left it", () => {
  render(<CaseStudyView caseStudy={caseStudy} />);
  expect(screen.getByTestId("case-study-header")).toHaveClass("justify-end", "pb-5");
});

test("defers the case study video until it is close to view", () => {
  render(<CaseStudyView caseStudy={withVideo} />);
  const video = screen.getByTestId("case-study-video");
  expect(video).not.toHaveAttribute("src");
  expect(video).toHaveAttribute("preload", "none");
  expect(video).toHaveAttribute("autoplay");
  expect(video).toHaveAttribute("loop");
});

test("shows that video exactly once", () => {
  render(<CaseStudyView caseStudy={withVideo} />);
  expect(screen.getAllByTestId("case-study-video")).toHaveLength(1);
});

test("renders no video for a case study that has none", () => {
  render(<CaseStudyView caseStudy={caseStudy} />);
  expect(screen.queryByTestId("case-study-video")).not.toBeInTheDocument();
});

test("centres the video in the body", () => {
  render(<CaseStudyView caseStudy={withVideo} />);
  expect(screen.getByTestId("case-study-video")).toHaveClass("mx-auto");
});

const written = {
  ...caseStudy,
  videoSrc: "/assets/jam.mp4",
  overview: "Rebuilding a retailer's identity system from the crest outward.",
  facts: [
    { label: "Role", value: "Lead Designer" },
    { label: "Timeline", value: "2024" },
  ],
  sections: [
    { heading: "The problem", body: "Inconsistent line work across applications." },
    { heading: "The turn", body: "One crest, redrawn at every scale it ships at." },
  ],
  media: [{ src: "/assets/crest.png", alt: "Crest variations" }],
};

test("sets the overview column beside the in-depth column", () => {
  render(<CaseStudyView caseStudy={written} />);
  const columns = screen.getByTestId("case-study-columns");
  expect(columns).toContainElement(screen.getByTestId("case-study-overview"));
  expect(columns).toContainElement(screen.getByTestId("case-study-detail"));
});

test("lists the at-a-glance facts in the overview column", () => {
  render(<CaseStudyView caseStudy={written} />);
  const overview = screen.getByTestId("case-study-overview");
  expect(overview).toContainElement(screen.getByText("Role"));
  expect(overview).toContainElement(screen.getByText("Lead Designer"));
  expect(overview).toContainElement(screen.getByText("Timeline"));
  expect(screen.getByTestId("case-study-detail")).toContainElement(
    screen.getByText("Rebuilding a retailer's identity system from the crest outward.")
  );
});

test("renders multi-value facts as a concise bulleted list", () => {
  render(
    <CaseStudyView
      caseStudy={{
        ...caseStudy,
        facts: [{ label: "Impact", value: ["First metric", "Second metric"] }],
      }}
    />
  );

  expect(screen.getByRole("list")).toHaveTextContent("First metric");
  expect(screen.getByRole("list")).toHaveTextContent("Second metric");
});

test("renders link facts as real, tappable links, not plain text", () => {
  // Contact details specifically need to be openable, not just readable.
  render(
    <CaseStudyView
      caseStudy={{
        ...caseStudy,
        facts: [
          {
            label: "Say hi",
            value: [
              { label: "hello@adrianklisz.com", href: "mailto:hello@adrianklisz.com" },
              { label: "LinkedIn", href: "https://www.linkedin.com/in/adrianklisz/" },
            ],
          },
        ],
      }}
    />
  );

  const email = screen.getByRole("link", { name: "hello@adrianklisz.com" });
  expect(email).toHaveAttribute("href", "mailto:hello@adrianklisz.com");
  const linkedIn = screen.getByRole("link", { name: "LinkedIn" });
  expect(linkedIn).toHaveAttribute("href", "https://www.linkedin.com/in/adrianklisz/");
});

test("puts every written section in the in-depth column", () => {
  render(<CaseStudyView caseStudy={written} />);
  const detail = screen.getByTestId("case-study-detail");
  // Section headings order the copy for whoever writes it; only the bodies
  // reach the page.
  expect(detail).toContainElement(
    screen.getByText("Inconsistent line work across applications.")
  );
  expect(detail).toContainElement(
    screen.getByText("One crest, redrawn at every scale it ships at.")
  );
});

test("collects all media below both columns, never between them", () => {
  render(<CaseStudyView caseStudy={written} />);
  const columns = screen.getByTestId("case-study-columns");
  const media = screen.getByTestId("case-study-media");

  expect(media).toContainElement(screen.getByTestId("case-study-video"));
  expect(media).toContainElement(screen.getByAltText("Crest variations"));
  // Bit 4 is DOCUMENT_POSITION_FOLLOWING: the media block comes after.
  expect(columns.compareDocumentPosition(media) & 4).toBeTruthy();
});

test("keeps the placeholder note while a case study is still unwritten", () => {
  render(<CaseStudyView caseStudy={caseStudy} />);
  expect(screen.getByTestId("case-study-detail")).toHaveTextContent(/Placeholder body copy/);
  expect(screen.queryByTestId("case-study-media")).not.toBeInTheDocument();
});

test("does not add placeholder copy after a complete overview", () => {
  render(<CaseStudyView caseStudy={{ ...caseStudy, overview: "A complete overview." }} />);
  expect(screen.getByText("A complete overview.")).toBeInTheDocument();
  expect(screen.queryByText(/Placeholder body copy/)).not.toBeInTheDocument();
});

test("always sets the rail beside the long read, per the two-column brief", () => {
  render(<CaseStudyView caseStudy={caseStudy} />);
  expect(screen.getByTestId("case-study-overview")).toBeInTheDocument();
  expect(screen.getByTestId("case-study-columns")).toHaveClass(
    "lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]"
  );
});

test("offers a way home and a way to the next project", () => {
  render(<CaseStudyView caseStudy={caseStudy} next={nextStudy} />);
  expect(screen.getByTestId("case-study-home")).toHaveAttribute("href", "/");
  expect(screen.getByTestId("case-study-next")).toHaveAttribute(
    "href",
    "/work/next-case"
  );
});

test("inks the next control in the colour of the project it leads to", () => {
  render(<CaseStudyView caseStudy={caseStudy} next={nextStudy} />);
  // The header stays this project's colour; only the arrow previews the next.
  expect(screen.getByTestId("case-study-header")).toHaveStyle({
    backgroundColor: "#15FF76",
  });
  expect(screen.getByTestId("case-study-next")).toHaveStyle({
    backgroundColor: "#F850C0",
  });
});

test("names the next control after where it goes", () => {
  render(<CaseStudyView caseStudy={caseStudy} next={nextStudy} />);
  expect(screen.getByTestId("case-study-next")).toHaveAccessibleName(
    /Next project: Next Case/i
  );
});

test("keeps the header on screen so both controls stay reachable", () => {
  render(<CaseStudyView caseStudy={caseStudy} next={nextStudy} />);
  expect(screen.getByTestId("case-study-header")).toHaveClass("sticky", "top-0");
});

test("shrinks the header once the page is scrolled, and restores it at the top", () => {
  render(<CaseStudyView caseStudy={caseStudy} next={nextStudy} />);
  const header = screen.getByTestId("case-study-header");
  expect(header).toHaveAttribute("data-shrunk", "false");

  act(() => {
    window.scrollY = 400;
    window.dispatchEvent(new Event("scroll"));
  });
  expect(header).toHaveAttribute("data-shrunk", "true");

  act(() => {
    window.scrollY = 0;
    window.dispatchEvent(new Event("scroll"));
  });
  expect(header).toHaveAttribute("data-shrunk", "false");
});

test("lays each media tile out at its authored span", () => {
  const tiled = {
    ...caseStudy,
    media: [
      { src: "/a.png", alt: "A", span: "full" as const },
      { src: "/b.png", alt: "B", span: "tall" as const },
      { src: "/c.png", alt: "C" },
    ],
  };
  render(<CaseStudyView caseStudy={tiled} next={nextStudy} />);
  const tiles = screen.getAllByTestId("case-study-tile");

  expect(tiles[0]).toHaveAttribute("data-span", "full");
  expect(tiles[1]).toHaveAttribute("data-span", "tall");
  // Unspecified tiles take the ordinary half-width cell.
  expect(tiles[2]).toHaveAttribute("data-span", "half");
});

test("renders a placeholder tile for media that has no asset yet", () => {
  const tiled = { ...caseStudy, media: [{ alt: "Coming soon" }] };
  render(<CaseStudyView caseStudy={tiled} next={nextStudy} />);
  // No src would otherwise render a broken image in the gallery.
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.getByTestId("case-study-tile")).toBeInTheDocument();
});

test("does not expose a hidden pull-to-exit gesture", () => {
  render(<CaseStudyView caseStudy={caseStudy} next={nextStudy} />);
  window.dispatchEvent(new WheelEvent("wheel", { deltaY: -400, cancelable: true }));
  expect(screen.queryByTestId("case-study-pull-progress")).not.toBeInTheDocument();
  expect(screen.getByTestId("case-study-view")).toHaveAttribute("data-exiting", "false");
  expect(push).not.toHaveBeenCalled();
});

test("keeps a home button, because the gesture is undiscoverable on its own", () => {
  render(<CaseStudyView caseStudy={caseStudy} next={nextStudy} />);
  expect(screen.getByTestId("case-study-home")).toHaveAttribute("href", "/");
});

test("names the next project in the pill that opens out of the arrow", () => {
  render(<CaseStudyView caseStudy={caseStudy} next={nextStudy} />);
  const label = screen.getByTestId("case-study-next-label");
  expect(label).toHaveTextContent("Next Case");
  // Collapsed at rest; CSS opens it on hover and keyboard focus. One weight
  // lighter than the case-study title next to it, so the two don't compete.
  expect(label).toHaveClass("case-study-next-label", "font-medium", "overflow-hidden");
  expect(screen.getByTestId("case-study-next")).toHaveClass("case-study-next");
});

test("puts a project framing headline above the titled overview beats", () => {
  render(<CaseStudyView caseStudy={written} next={nextStudy} />);
  const columns = screen.getByTestId("case-study-columns");
  const detail = screen.getByTestId("case-study-detail");

  // The headline is its own grid item now, not nested in case-study-detail --
  // that's what lets it reorder ahead of the facts on narrow screens without
  // duplicating markup. Only the two section headings live in detail.
  expect(detail.querySelectorAll("h2")).toHaveLength(2);
  const headline = screen.getByText("A test blurb.");
  expect(headline).toHaveClass("case-study-intro-title");
  expect(headline.parentElement).toBe(columns);
  expect(screen.getByText("The problem")).toHaveClass("font-body", "font-bold");
  expect(
    screen.getByText("Inconsistent line work across applications.")
  ).toBeInTheDocument();
  expect(screen.getByText("One crest, redrawn at every scale it ships at.")).toBeInTheDocument();
});

test("renders a concise supporting list when a work overview needs one", () => {
  const withBullets = {
    ...written,
    sections: [
      {
        heading: "The decision",
        body: "A short setup.",
        bullets: ["The constraint", "The trade-off"],
      },
    ],
  };
  render(<CaseStudyView caseStudy={withBullets} next={nextStudy} />);

  expect(screen.getByRole("list")).toHaveTextContent("The constraint");
  expect(screen.getByRole("list")).toHaveTextContent("The trade-off");
});

test("sets the long read larger than the overview rail", () => {
  render(<CaseStudyView caseStudy={written} next={nextStudy} />);
  const body = screen.getByText("Inconsistent line work across applications.");
  expect(body.closest(".case-study-copy")).not.toBeNull();
});

test("collapses long reads until the reader asks to continue", () => {
  const longRead = {
    ...written,
    sections: [
      { heading: "One", body: "First section." },
      { heading: "Two", body: "Second section." },
      { heading: "Three", body: "Third section." },
      { heading: "Four", body: "Fourth section." },
    ],
  };
  render(<CaseStudyView caseStudy={longRead} next={nextStudy} />);

  expect(screen.getByText("First section.")).toBeInTheDocument();
  expect(screen.queryByText("Second section.")).not.toBeInTheDocument();
  expect(screen.queryByText("Third section.")).not.toBeInTheDocument();
  const toggle = screen.getByTestId("case-study-read-more");
  expect(toggle).toHaveTextContent("Read more");
  expect(toggle).toHaveAttribute("aria-expanded", "false");

  fireEvent.click(toggle);
  expect(screen.getByText("Second section.")).toBeInTheDocument();
  expect(screen.getByText("Third section.")).toBeInTheDocument();
  expect(screen.getByText("Fourth section.")).toBeInTheDocument();
  expect(toggle).toHaveTextContent("Show less");
  expect(toggle).toHaveAttribute("aria-expanded", "true");
});

test("keeps a continuous narrative unheaded while still offering Read more", () => {
  const continuous = {
    ...written,
    sections: [
      { body: "First continuation." },
      { body: "Second continuation." },
      { body: "Third continuation." },
    ],
  };
  render(<CaseStudyView caseStudy={continuous} next={nextStudy} />);

  expect(screen.getByText("First continuation.")).toBeInTheDocument();
  expect(screen.queryByText("Second continuation.")).not.toBeInTheDocument();
  expect(screen.getByTestId("case-study-read-more")).toHaveTextContent("Read more");
  expect(screen.queryByRole("heading", { name: "First continuation." })).not.toBeInTheDocument();
});

test("centres the collapsed bar's controls instead of letting them overflow it", () => {
  render(<CaseStudyView caseStudy={caseStudy} next={nextStudy} />);
  const header = screen.getByTestId("case-study-header");

  // Bottom-aligning a row taller than the collapsed bar pushed the next button
  // out through the top of it. The CSS keys off these hooks.
  expect(header.querySelector(".case-study-header-row")).toBeInTheDocument();
  expect(header.querySelector(".case-study-next-arrow")).toBeInTheDocument();
  expect(screen.getByTestId("case-study-home")).toHaveClass("case-study-home");
});

test("offers a sketched home icon in the header's upper-right corner", () => {
  render(<CaseStudyView caseStudy={caseStudy} next={nextStudy} />);
  const home = screen.getByTestId("case-study-home");

  // The inverse of the homepage's down arrow: same idea, pointing back up.
  expect(home).toHaveAttribute("href", "/");
  // CSS shares the header's responsive content inset (including the 100rem
  // centred cap); the link itself must not carry a separate right offset.
  expect(home.className).toMatch(/top-5/);
  expect(home.className).toMatch(/md:top-7/);
  expect(home.className).not.toMatch(/(?:^|\s)(?:left|md:left|2xl:left)-/);
  expect(home.className).not.toMatch(/-translate-x-1\/2/);
  expect(home.className).not.toMatch(/hover:opacity-/);
  const icon = screen.getByTestId("case-study-home-label");
  expect(home).toContainElement(icon);
  // A sketched icon, not the plain "BACK" word: boil-line is what redraws
  // its edges each frame the same way the rest of the hand-drawn marks do.
  expect(icon.tagName).toBe("IMG");
  expect(icon).toHaveClass("boil-line");
  expect(icon).toHaveClass("case-study-home-icon");
  expect(icon).toHaveAttribute("src", "/assets/home-animation-1.svg");
  expect(icon).toHaveAttribute("width", "40");
  expect(icon).toHaveAttribute("height", "40");
  // The icon has no text of its own, so the link needs its own label.
  expect(home).toHaveAccessibleName("Home");
});

test("drops the page home on the arrow, rather than cutting to it", () => {
  jest.useFakeTimers();
  try {
    render(<CaseStudyView caseStudy={caseStudy} next={nextStudy} />);
    fireEvent.click(screen.getByTestId("case-study-home"), { button: 0 });

    // Same departure the pull gesture uses, not a bare navigation.
    expect(screen.getByTestId("case-study-view")).toHaveAttribute("data-exiting", "true");
    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(push).toHaveBeenCalledWith("/");
  } finally {
    jest.useRealTimers();
  }
});

test("leaves modified clicks to the browser", () => {
  render(<CaseStudyView caseStudy={caseStudy} next={nextStudy} />);
  // Opening home in a new tab should not start an animation in this one.
  fireEvent.click(screen.getByTestId("case-study-home"), { button: 0, metaKey: true });
  expect(screen.getByTestId("case-study-view")).toHaveAttribute("data-exiting", "false");
});
