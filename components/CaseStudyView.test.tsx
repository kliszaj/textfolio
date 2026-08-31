import { act, fireEvent, render, screen } from "@testing-library/react";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, prefetch: jest.fn() }),
}));

beforeEach(() => {
  push.mockClear();
  window.scrollY = 0;
});

import { EXIT_PULL_THRESHOLD_PX } from "@/lib/scrollExit";
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

test("puts the title in the header and the blurb at the head of the rail", () => {
  render(<CaseStudyView caseStudy={caseStudy} />);
  expect(screen.getByTestId("case-study-header")).toContainElement(
    screen.getByText("Test Case")
  );
  // The header carries the title and the two controls only; the blurb is the
  // one-line overview the left column leads with.
  expect(screen.getByTestId("case-study-overview")).toContainElement(
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

test("shows the case study's video as soon as the page opens", () => {
  render(<CaseStudyView caseStudy={withVideo} />);
  const video = screen.getByTestId("case-study-video");
  expect(video).toHaveAttribute("src", "/assets/jam.mp4");
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
  expect(overview).toContainElement(
    screen.getByText("Rebuilding a retailer's identity system from the crest outward.")
  );
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

function wheelUp(deltaY: number) {
  act(() => {
    window.dispatchEvent(new WheelEvent("wheel", { deltaY, cancelable: true }));
  });
}

test("follows the reader down as they keep scrolling up at the top", () => {
  render(<CaseStudyView caseStudy={caseStudy} next={nextStudy} />);
  const view = screen.getByTestId("case-study-view");
  expect(view.style.transform).toBe("translateY(0px)");

  wheelUp(-80);
  // Damped, so the page lags the gesture rather than tracking it one-to-one.
  const offset = parseFloat(view.style.transform.replace(/[^0-9.]/g, ""));
  expect(offset).toBeGreaterThan(0);
  expect(offset).toBeLessThan(80);
});

test("shows how close the pull is to committing", () => {
  render(<CaseStudyView caseStudy={caseStudy} next={nextStudy} />);
  const meter = screen.getByTestId("case-study-pull-progress");
  expect(meter).toHaveStyle({ transform: "scaleX(0)" });

  wheelUp(-EXIT_PULL_THRESHOLD_PX / 2);
  expect(meter).toHaveStyle({ transform: "scaleX(0.5)" });
});

test("drops the page back onto the stack, then goes home", () => {
  jest.useFakeTimers();
  try {
    render(<CaseStudyView caseStudy={caseStudy} next={nextStudy} />);
    wheelUp(-EXIT_PULL_THRESHOLD_PX);

    const view = screen.getByTestId("case-study-view");
    expect(view).toHaveAttribute("data-exiting", "true");
    // Falls all the way off before navigating, so the drop is seen.
    expect(view.style.transform).toBe("translateY(100vh)");
    expect(push).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(push).toHaveBeenCalledWith("/");
  } finally {
    jest.useRealTimers();
  }
});

test("keeps a home button, because the gesture is undiscoverable on its own", () => {
  render(<CaseStudyView caseStudy={caseStudy} next={nextStudy} />);
  expect(screen.getByTestId("case-study-home")).toHaveAttribute("href", "/");
});

test("names the next project in the pill that opens out of the arrow", () => {
  render(<CaseStudyView caseStudy={caseStudy} next={nextStudy} />);
  const label = screen.getByTestId("case-study-next-label");
  expect(label).toHaveTextContent("Next Case");
  // Collapsed at rest; CSS opens it on hover and keyboard focus.
  expect(label).toHaveClass("case-study-next-label", "overflow-hidden");
  expect(screen.getByTestId("case-study-next")).toHaveClass("case-study-next");
});

test("runs the long read as plain paragraphs, with no headings of its own", () => {
  render(<CaseStudyView caseStudy={written} next={nextStudy} />);
  const detail = screen.getByTestId("case-study-detail");

  // One or two paragraphs do not need signposting; the headings were louder
  // than the copy they introduced.
  expect(detail.querySelectorAll("h2")).toHaveLength(0);
  expect(screen.queryByText("The problem")).not.toBeInTheDocument();
  expect(
    screen.getByText("Inconsistent line work across applications.")
  ).toBeInTheDocument();
  expect(screen.getByText("One crest, redrawn at every scale it ships at.")).toBeInTheDocument();
});

test("sets the long read larger than the overview rail", () => {
  render(<CaseStudyView caseStudy={written} next={nextStudy} />);
  const body = screen.getByText("Inconsistent line work across applications.");
  expect(body).toHaveClass("case-study-copy");
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

test("offers a written BACK home, ranged left with the title", () => {
  render(<CaseStudyView caseStudy={caseStudy} next={nextStudy} />);
  const home = screen.getByTestId("case-study-home");

  // The inverse of the homepage's down arrow: same idea, pointing back up.
  expect(home).toHaveAttribute("href", "/");
  // Shares the header's own padding, so it lines up with the title beneath.
  expect(home.className).toMatch(/left-6/);
  expect(home.className).not.toMatch(/-translate-x-1\/2/);
  const label = screen.getByTestId("case-study-home-label");
  expect(home).toContainElement(label);
  // Written in the same hand as the homepage tagline; .font-script is what
  // carries the line boil, so it draws rather than prints.
  expect(label).toHaveClass("font-script");
  expect(label).toHaveTextContent("BACK");
  // The word is the link's accessible name now, so no aria-label overrides it.
  expect(home).toHaveAccessibleName("BACK");
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
