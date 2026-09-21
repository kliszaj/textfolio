"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { HomeIconAnimation } from "@/components/HomeIconAnimation";
import { InlineLinkPreview } from "@/components/InlineLinkPreview";
import { LazyVideo } from "@/components/LazyVideo";
import { caseStudyRoute } from "@/data/caseStudies";
import { HEADER_SETTLE_MS, HEADER_SHRINK_AT_PX, nextHeaderShrunk } from "@/lib/stickyHeader";
import { markReturningHome } from "@/hooks/useStackCollapse";
import type { CaseStudy, CaseStudyFact, CaseStudyMedia, CaseStudyOverviewLink } from "@/data/caseStudies";
import type { ReactNode } from "react";

type CaseStudyViewProps = {
  caseStudy: CaseStudy;
  // Where the header arrow leads. Optional so the view still renders standalone.
  next?: CaseStudy;
  // Route-specific sections belong to the same sheet so they leave with the
  // header and body during the explicit home transition.
  children?: ReactNode;
};

// Matched to the homepage's own arrow, a step down so it sits inside the
// header rather than filling it.

// The drop back onto the stack. The inverse of the sheet lift that opened it.
const EXIT_ANIMATION_MS = 420;
// Keep the first beat visible, then invite the reader onward before the long
// read pushes the first evidence tile below the initial viewport.
const COLLAPSED_SECTION_COUNT = 1;
// Two concise beats are already an overview, not a long read. Preserve those
// in full; three or more use the shorter opening above.
const COLLAPSIBLE_SECTION_MINIMUM = COLLAPSED_SECTION_COUNT + 1;

export function caseStudyTitleScale(naturalWidth: number, availableWidth: number): number {
  if (
    !Number.isFinite(naturalWidth) ||
    !Number.isFinite(availableWidth) ||
    naturalWidth <= 0 ||
    availableWidth <= 0
  ) {
    return 1;
  }

  return Math.min(1, availableWidth / naturalWidth);
}

export function caseStudyMediaRows(media: CaseStudyMedia[]): number[] {
  let row = 0;
  let occupiedColumns = 0;

  return media.map((item) => {
    if ((item.span ?? "half") === "full") {
      if (occupiedColumns > 0) {
        row += 1;
        occupiedColumns = 0;
      }
      const itemRow = row;
      row += 1;
      return itemRow;
    }

    const itemRow = row;
    occupiedColumns += 1;
    if (occupiedColumns === 2) {
      row += 1;
      occupiedColumns = 0;
    }
    return itemRow;
  });
}

// Two videos sharing a row both playing at once, unprompted, reads as noise
// rather than evidence -- scroll can only pick one active row, not one tile
// within it. A row like that plays on hover instead (see the tile map in the
// render below), and this is where "does this tile need that" gets decided.
export function isPairedVideoTile(
  media: CaseStudyMedia[],
  mediaRows: number[],
  index: number
): boolean {
  const item = media[index];
  if (!item || item.kind !== "video") return false;
  const row = mediaRows[index];
  return media.some((other, otherIndex) =>
    otherIndex !== index && other.kind === "video" && mediaRows[otherIndex] === row
  );
}

// Which of a paired row's videos plays, going purely off where the cursor
// sits across the row's full width -- not just whether it's directly over
// one of the tiles. The margin on either side of the row (and the gap
// between the two tiles) still belongs to whichever tile is on that side,
// so the row is never silent just because the cursor hasn't landed exactly
// on a video, and it plays the one the cursor is actually closest to rather
// than always defaulting to the first. xRatio is the cursor's position
// across the row as a 0-1 fraction (0 = left edge, 1 = right edge).
export function pairedVideoIndexForPointer(
  media: CaseStudyMedia[],
  mediaRows: number[],
  row: number,
  xRatio: number
): number {
  const indices = media
    .map((_, index) => index)
    .filter((index) => media[index].kind === "video" && mediaRows[index] === row);
  if (indices.length === 0) return -1;
  const clamped = Math.min(1, Math.max(0, xRatio));
  const slot = Math.min(indices.length - 1, Math.floor(clamped * indices.length));
  return indices[slot];
}

type PlaybackRowBounds = {
  row: string;
  top: number;
  bottom: number;
};

export function activePlaybackRowForViewport(
  rows: PlaybackRowBounds[],
  viewportHeight: number,
  atDocumentEnd = false
): string | null {
  const visibleRows = rows.filter(
    ({ top, bottom }) => bottom > 0 && top < viewportHeight
  );

  if (visibleRows.length === 0) return null;

  // The final row can never reach the viewport centre because the document
  // ends beneath it. Once the reader reaches the page bottom, prefer the
  // lowest visible row so that the last video can still become active.
  if (atDocumentEnd) {
    return visibleRows.reduce((lowest, row) =>
      row.bottom > lowest.bottom ? row : lowest
    ).row;
  }

  const viewportCenter = viewportHeight / 2;
  return visibleRows.reduce((closest, row) => {
    const closestCenter = (closest.top + closest.bottom) / 2;
    const rowCenter = (row.top + row.bottom) / 2;
    return Math.abs(rowCenter - viewportCenter) < Math.abs(closestCenter - viewportCenter)
      ? row
      : closest;
  }).row;
}

const SPAN_CLASS: Record<NonNullable<CaseStudyMedia["span"]>, string> = {
  full: "col-span-2 row-span-2",
  tall: "col-span-1 row-span-2",
  half: "col-span-1 row-span-1",
};

const SEQUENCE_SPAN_CLASS: Record<NonNullable<CaseStudyMedia["span"]>, string> = {
  full: "col-span-2",
  tall: "col-span-1",
  half: "col-span-1",
};

const ASPECT_CLASS: Record<NonNullable<CaseStudyMedia["aspect"]>, string> = {
  landscape: "aspect-video",
  portrait: "aspect-[9/16]",
  wide: "aspect-[3/1]",
};

// Wraps every occurrence of each phrase in <strong>, for the odd stat that
// wants weight without becoming a link -- a fact number sitting inline in a
// sentence, not pulled into its own rail entry. Phrases are matched against
// the plain-text stretches renderLinkedCopy already isn't handing to a link,
// so a bold phrase and a link phrase never fight over the same substring.
function boldPhrasesIn(text: string, phrases: string[]): React.ReactNode {
  if (phrases.length === 0) return text;

  const matches = phrases
    .map((phrase) => ({ phrase, start: text.indexOf(phrase) }))
    .filter((match) => match.start !== -1)
    .sort((a, b) => a.start - b.start);
  if (matches.length === 0) return text;

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  for (const { phrase, start } of matches) {
    if (start < cursor) continue; // Overlaps a phrase already claimed.
    nodes.push(text.slice(cursor, start));
    nodes.push(<strong key={`${phrase}-${start}`}>{phrase}</strong>);
    cursor = start + phrase.length;
  }
  nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

function renderLinkedCopy(
  copy: string,
  links?: CaseStudyOverviewLink | CaseStudyOverviewLink[],
  // The NEXT case study's color -- previews read as a bridge onward, not a
  // restatement of the page the reader is already on.
  accentColor?: string,
  boldPhrases: string[] = []
) {
  const requestedLinks = Array.isArray(links) ? links : links ? [links] : [];
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const link of requestedLinks) {
    const start = copy.indexOf(link.label, cursor);
    if (start === -1) continue;

    parts.push(boldPhrasesIn(copy.slice(cursor, start), boldPhrases));
    parts.push(
      <InlineLinkPreview
        key={`${link.href}-${start}`}
        link={link}
        accentColor={accentColor}
      />
    );
    cursor = start + link.label.length;
  }

  return parts.length === 0
    ? boldPhrasesIn(copy, boldPhrases)
    : <>{parts}{boldPhrasesIn(copy.slice(cursor), boldPhrases)}</>;
}

// Shared between the sticky rail and the top columns row -- the same fact
// shape, just placed differently.
function renderFactValue(fact: CaseStudyFact) {
  if (!Array.isArray(fact.value)) return fact.value;
  return (
    <ul className="case-study-fact-list">
      {fact.value.map((item) =>
        typeof item === "string" ? (
          <li key={item}>{item}</li>
        ) : (
          <li key={item.href}>
            <a href={item.href} className="underline underline-offset-2 hover:opacity-70">
              {item.label}
            </a>
          </li>
        )
      )}
    </ul>
  );
}

export function CaseStudyView({ caseStudy, next, children }: CaseStudyViewProps) {
  const {
    oneLiner,
    overview,
    overviewLink,
    overviewContactLinks,
    facts = [],
    introImage,
    sections = [],
    media = [],
    mediaLayout = "mosaic",
    mediaPadded = false,
    videoSrc,
  } = caseStudy;
  const hasMedia = Boolean(videoSrc) || media.length > 0;
  const hasFacts = facts.length > 0;
  const hasBodyContent = hasFacts || Boolean(overview) || Boolean(introImage) || sections.length > 0 || hasMedia || !children;
  const router = useRouter();

  const [shrunk, setShrunk] = useState(false);
  // The settle animation fills forwards, which pins height and beats any
  // declarative rule. Once it is done the header goes back to plain CSS so the
  // scroll shrink can transition.
  const [settled, setSettled] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [isLongReadExpanded, setIsLongReadExpanded] = useState(false);
  const [activePlaybackRow, setActivePlaybackRow] = useState<string | null>(null);
  // Scroll can only pick one active row, not one tile within it -- a row
  // holding two videos side by side needs its own signal, or both play
  // together the instant the row scrolls into view. Tracked as the
  // pointer's fractional x position across the whole grid (not which tile
  // it's directly over), so a margin or the gap between the two tiles still
  // belongs to whichever side it's on, the same as the render below reads
  // it via pairedVideoIndexForPointer.
  const [mediaPointerXRatio, setMediaPointerXRatio] = useState<number | null>(null);
  const titleContainerRef = useRef<HTMLHeadingElement>(null);
  const titleButtonRef = useRef<HTMLButtonElement>(null);
  const mediaSectionRef = useRef<HTMLElement>(null);
  const mediaGridRef = useRef<HTMLDivElement>(null);
  const mediaRows = caseStudyMediaRows(media);
  const hasPairedVideoRow = media.some((_, index) => isPairedVideoTile(media, mediaRows, index));
  const hasPlayableMedia = Boolean(videoSrc) || media.some((item) => item.kind === "video");
  const hasCollapsibleLongRead = sections.length > COLLAPSIBLE_SECTION_MINIMUM;
  const visibleSections = hasCollapsibleLongRead && !isLongReadExpanded
    ? sections.slice(0, COLLAPSED_SECTION_COUNT)
    : sections;

  const [hasWideMargin, setHasWideMargin] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 80rem)");
    setHasWideMargin(mql.matches);
    const onChange = () => setHasWideMargin(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), 620);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const section = mediaSectionRef.current;
    if (!section || !hasPlayableMedia) return;

    let frame: number | null = null;

    const updateActiveRow = () => {
      frame = null;
      const viewportHeight = window.innerHeight;
      const rowBounds = new Map<string, { top: number; bottom: number }>();

      section.querySelectorAll<HTMLElement>("[data-playback-row]").forEach((element) => {
        const row = element.dataset.playbackRow;
        if (!row) return;
        const bounds = element.getBoundingClientRect();
        const current = rowBounds.get(row);
        rowBounds.set(row, {
          top: current ? Math.min(current.top, bounds.top) : bounds.top,
          bottom: current ? Math.max(current.bottom, bounds.bottom) : bounds.bottom,
        });
      });

      const documentHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      const atDocumentEnd = window.scrollY + viewportHeight >= documentHeight - 8;
      const closestVisibleRow = activePlaybackRowForViewport(
        Array.from(rowBounds, ([row, bounds]) => ({ row, ...bounds })),
        viewportHeight,
        atDocumentEnd
      );

      setActivePlaybackRow((current) =>
        current === closestVisibleRow ? current : closestVisibleRow
      );
    };

    const scheduleUpdate = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(updateActiveRow);
    };

    updateActiveRow();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(scheduleUpdate);
    resizeObserver?.observe(section);

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      resizeObserver?.disconnect();
    };
  }, [hasPlayableMedia]);

  // Tracked at the window rather than the grid: the grid's own box ends
  // where the tiles do, so a listener scoped to it never sees the margins
  // on either side of the row -- exactly the space this is meant to cover.
  // Reading which side of the row the cursor is on only matters once a
  // paired row is actually active, so this stays a plain position tracker
  // and leaves that decision to pairedVideoIndexForPointer in the render.
  useEffect(() => {
    if (!hasPairedVideoRow) return;

    const onPointerMove = (event: PointerEvent) => {
      const grid = mediaGridRef.current;
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      if (!rect.width) return;
      setMediaPointerXRatio((event.clientX - rect.left) / rect.width);
    };

    window.addEventListener("pointermove", onPointerMove);
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [hasPairedVideoRow]);

  useLayoutEffect(() => {
    const container = titleContainerRef.current;
    const title = titleButtonRef.current;
    if (!container || !title) return;

    const fit = () => {
      const scale = caseStudyTitleScale(title.scrollWidth, container.clientWidth);
      title.style.setProperty("--case-study-title-fit", String(scale));
    };

    fit();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    observer?.observe(container);
    window.addEventListener("resize", fit);
    void document.fonts?.ready.then(fit);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [caseStudy.title]);

  const shrunkRef = useRef(false);

  // A fresh load should always land at the top with the full header --
  // never wherever the browser's own scroll restoration (or a scroll
  // position left over from before a refresh) happens to put it. Runs
  // before paint so there is nothing to visibly snap back from.
  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let changedAt = -Infinity;
    let recheckTimer: ReturnType<typeof setTimeout> | null = null;

    const recheck = () => {
      recheckTimer = null;
      settle(nextHeaderShrunk({
        shrunk: shrunkRef.current,
        currentY: window.scrollY,
        sinceChangeMs: performance.now() - changedAt,
      }));
    };

    const settle = (next: boolean) => {
      if (next === shrunkRef.current) return;
      shrunkRef.current = next;
      changedAt = performance.now();
      setShrunk(next);

      // Shrinking changes the header's own height, which on a short page
      // (About, with no media) can remove the last of the page's overflow
      // and silently clamp scrollY back to 0. No further "scroll" event
      // ever fires once there is nothing left to scroll, so without this
      // the header would stay stuck compact and the page would read as
      // frozen. Recheck once the height change has had time to land.
      if (next && recheckTimer === null) {
        recheckTimer = setTimeout(recheck, HEADER_SETTLE_MS);
      }
    };

    const onScroll = () => {
      const currentY = window.scrollY;
      settle(nextHeaderShrunk({
        shrunk: shrunkRef.current,
        currentY,
        sinceChangeMs: performance.now() - changedAt,
      }));
    };

    // A restored position has no wheel gesture to observe, so initialize from
    // its distance down the page. Fresh pages remain full at the top.
    settle(window.scrollY > HEADER_SHRINK_AT_PX);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (recheckTimer !== null) clearTimeout(recheckTimer);
    };
  }, []);

  // Home is an intentional click, not a hidden scroll gesture. The page still
  // drops back onto the stack so this explicit route change carries the same
  // visual language as the sheet lift that opened it.
  const leave = useCallback(() => {
    markReturningHome(caseStudy.slug);
    setExiting(true);
    setTimeout(() => router.push("/"), EXIT_ANIMATION_MS);
  }, [caseStudy, router]);

  const scrollToTop = useCallback(() => {
    // The title is an explicit request to return homeward, so reveal the full
    // header immediately instead of waiting for the smooth scroll to finish.
    shrunkRef.current = false;
    setShrunk(false);
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, []);

  return (
    <>
      {/* Revealed behind the page during the explicit home transition. */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-cream" />
      <main
        data-testid="case-study-view"
        data-exiting={exiting}
        // Not min-h-screen: a short page (About, with no media) doesn't need
        // padding out to a full viewport, and the fixed cream layer above
        // already covers the screen regardless of this element's real height.
        className="bg-cream text-ink"
        style={{
          transform: exiting ? "translateY(100vh)" : undefined,
          transition: exiting
            ? `transform ${EXIT_ANIMATION_MS}ms cubic-bezier(0.4, 0, 1, 1)`
            : undefined,
        }}
      >
        {/* Starts full-bleed and settles to header height, so the colour the
            sheet lift left filling the screen contracts into the header rather
            than popping. It then stays put: home and next stay reachable from
            anywhere on the page. */}
        <header
          data-testid="case-study-header"
          data-shrunk={shrunk}
          data-settled={settled}
          className="case-study-header sticky top-0 z-30 relative flex flex-col justify-end pb-5 md:pb-7"
          style={{ '--case-study-color': caseStudy.thumbnailColor } as React.CSSProperties}
        >
          {/* Same max-width-and-centre box the columns use below (case-study-body
              provides the padding the way this header does, outside the max-width,
              so both cap at an identical content width and land on the same edges
              at every viewport size). No padding of its own here -- adding it would
              double up with the header's, which is exactly the bug that shipped
              the first time this was "fixed": the classes matched, but padding
              inside the max-width box is not the same box as padding outside it. */}
          <div className="case-study-header-inner static mx-auto w-full max-w-[100rem]">
            {/* The inverse of the homepage's down arrow, and it leaves the same
                way the pull gesture does. A real link, so the browser's own
                open-in-a-new-tab still works; only a plain click is intercepted. */}
            <Link
              data-testid="case-study-home"
              href="/"
              onClick={(event) => {
                if (
                  event.button !== 0 ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                ) {
                  return;
                }
                event.preventDefault();
                leave();
              }}
              aria-label="Home"
              className="case-study-home absolute top-5 md:top-7 xl:top-8"
            >
              {/* boil-line redraws the icon's edges each frame with the same
                  turbulence displacement as the rest of the hand-drawn marks,
                  so a plain raster icon still reads as sketched rather than
                  a clean UI glyph. */}
            <HomeIconAnimation shrunk={shrunk && !hasWideMargin} />
            </Link>

            <div className="case-study-header-row flex items-center justify-between gap-6">
              <h1
                ref={titleContainerRef}
                data-testid="case-study-title"
                className="case-study-title min-w-0 flex-1 overflow-hidden font-display leading-none"
              >
                <button
                  ref={titleButtonRef}
                  type="button"
                  title="Back to top"
                  onClick={scrollToTop}
                  className="case-study-title-button cursor-pointer whitespace-nowrap rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
                >
                  {caseStudy.title}
                </button>
              </h1>
              {next && (
                <Link
                  data-testid="case-study-next"
                  href={caseStudyRoute(next)}
                  // The control wears the colour of the project it leads to, and
                  // opens into a pill naming it, so the next sheet announces
                  // itself before you commit to it.
                  style={{ backgroundColor: next.thumbnailColor }}
                  className="case-study-next group shrink-0 inline-flex items-center rounded-full h-14 md:h-16"
                >
                  <span className="sr-only">Next project:</span>
                  <span
                    data-testid="case-study-next-label"
                    className="case-study-next-label font-body font-medium whitespace-nowrap overflow-hidden"
                  >
                    {next.title}
                  </span>
                  <span className="case-study-next-arrow grid place-items-center size-14 md:size-16 shrink-0">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M4 12h15m0 0-6-6m6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </Link>
              )}
            </div>
          </div>
        </header>

        {hasBodyContent && (
        <div
          data-testid="case-study-body"
          data-padded={mediaPadded}
          className="case-study-body py-10 md:py-14"
        >
          <div
            data-testid="case-study-columns"
            className={`mx-auto grid w-full max-w-[100rem] gap-x-12 gap-y-8${
              hasFacts ? " xl:grid-cols-[1fr_18rem] xl:gap-x-16" : ""
            }`}
          >
            <div
              data-testid="case-study-detail"
              className="font-body font-medium"
            >
              {introImage && (
                <figure
                  data-testid="case-study-intro-image"
                  className="mb-8 overflow-hidden rounded-2xl bg-ink/10"
                >
                  <Image
                    src={introImage.src}
                    alt={introImage.alt}
                    width={introImage.width}
                    height={introImage.height}
                    sizes="(min-width: 1280px) calc(100vw - 28rem), calc(100vw - 3rem)"
                    className="h-auto w-full"
                  />
                </figure>
              )}
              {oneLiner && (
                <p className="case-study-one-liner font-body font-medium mb-6">
                  {oneLiner}
                </p>
              )}
              {overview && (
                <p className="case-study-copy case-study-intro-copy mb-8">
                  {renderLinkedCopy(overview, overviewLink, next?.thumbnailColor)}
                </p>
              )}
              {sections.length > 0 ? (
                <>
                {visibleSections.map((section) => (
                  <section key={section.heading ?? section.body} className="case-study-copy mb-8 last:mb-0">
                    {section.heading && (
                      <h2 className="font-body font-bold text-2xl leading-none mb-3">{section.heading}</h2>
                    )}
                    <p>{renderLinkedCopy(section.body, section.bodyLinks ?? section.bodyLink, next?.thumbnailColor, section.boldPhrases)}</p>
                    {section.bullets && section.bullets.length > 0 && (
                      <ul className="mt-3 list-disc space-y-2 pl-5">
                        {section.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
                {hasCollapsibleLongRead && (
                  <button
                    type="button"
                    data-testid="case-study-read-more"
                    aria-expanded={isLongReadExpanded}
                    onClick={() => setIsLongReadExpanded((expanded) => !expanded)}
                    className="mt-2 font-display text-xl underline underline-offset-4 transition-opacity hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
                  >
                    {isLongReadExpanded ? "Show less" : "Read more"}
                  </button>
                )}
                </>
              ) : !overview && !children ? (
                <p className="case-study-copy">
                  Placeholder body copy for {caseStudy.title}. The real write-up goes
                  here: process, decisions, and the work itself.
                </p>
              ) : null}
              {overviewContactLinks && overviewContactLinks.length > 0 && (
                <p className="case-study-copy mt-8">
                  {overviewContactLinks.map((link, index) => (
                    <span key={link.href}>
                      {index > 0 && " · "}
                      <a
                        href={link.href}
                        className="underline underline-offset-2 hover:opacity-70"
                      >
                        {link.label}
                      </a>
                    </span>
                  ))}
                </p>
              )}
            </div>

            {hasFacts && (
              <aside
                data-testid="case-study-facts-aside"
                className="case-study-facts-aside font-body font-medium xl:sticky xl:top-32 xl:self-start"
              >
                <dl className="case-study-facts">
                  {facts.map((fact) => (
                    <div key={fact.label} className="case-study-fact">
                      <dt>{fact.label}</dt>
                      <dd>{renderFactValue(fact)}</dd>
                    </div>
                  ))}
                </dl>
              </aside>
            )}
          </div>

          {/* Evidence follows the reading columns on the same left and right
              edges, so video and media feel part of the editorial page rather
              than a separate full-width gallery. */}
          {hasMedia && (
            <section
              ref={mediaSectionRef}
              data-testid="case-study-media"
              data-padded={mediaPadded}
              className="mx-auto mt-10 w-full max-w-[100rem]"
            >
              {videoSrc && (
                <LazyVideo
                  data-testid="case-study-video"
                  className="w-full mx-auto rounded-2xl"
                  src={videoSrc}
                  data-playback-row="primary"
                  style={{ backgroundColor: caseStudy.thumbnailColor }}
                  loadImmediately
                  playing={activePlaybackRow === "primary"}
                  muted
                  loop
                  playsInline
                  controls
                />
              )}
              {media.length > 0 && (
                <div
                  ref={mediaGridRef}
                  data-testid="case-study-media-grid"
                  data-layout={mediaLayout}
                  className={`mt-8 grid grid-cols-2 gap-4 md:gap-6 ${
                    mediaLayout === "mosaic" ? "auto-rows-[11rem] md:auto-rows-[16rem]" : ""
                  }`}
                >
                  {media.map((item, index) => {
                    const span = item.span ?? "half";
                    const tileLayout = mediaLayout === "sequence"
                      ? `${SEQUENCE_SPAN_CLASS[span]} ${item.aspect ? ASPECT_CLASS[item.aspect] : ""}`
                      : SPAN_CLASS[span];
                    const row = mediaRows[index];
                    const paired = isPairedVideoTile(media, mediaRows, index);
                    // The pointer's x position across the whole row decides
                    // which of the paired videos plays -- the margin on
                    // either side, and the gap between the tiles, belong to
                    // whichever side they're on. No pointer at all (touch,
                    // or the cursor is elsewhere on the page) still plays
                    // the earlier one rather than leaving the row silent.
                    const pairedPlayingIndex = paired
                      ? mediaPointerXRatio === null
                        ? pairedVideoIndexForPointer(media, mediaRows, row, 0)
                        : pairedVideoIndexForPointer(media, mediaRows, row, mediaPointerXRatio)
                      : -1;
                    return (
                      <figure
                        key={item.src ?? `${item.alt}-${index}`}
                        data-testid="case-study-tile"
                        data-span={span}
                        data-aspect={item.aspect}
                        className={`${tileLayout} overflow-hidden rounded-2xl bg-ink/20`}
                      >
                        {item.src ? (
                          item.kind === "video" ? (
                            <LazyVideo
                              className="size-full object-cover"
                              src={item.src}
                              data-playback-row={`media-${row}`}
                              loadImmediately
                              playing={activePlaybackRow === `media-${row}`
                                && (!paired || index === pairedPlayingIndex)}
                              muted
                              loop
                              playsInline
                            />
                          ) : (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={item.src}
                              alt={item.alt}
                              className="size-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          )
                        ) : (
                          // No asset yet: hold the cell rather than render a
                          // broken image, so the gallery rhythm is still visible.
                          <figcaption className="sr-only">{item.alt}</figcaption>
                        )}
                      </figure>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
        )}
        {children}
      </main>
    </>
  );
}
