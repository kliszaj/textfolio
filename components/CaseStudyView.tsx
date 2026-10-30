"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { HomeIconAnimation } from "@/components/HomeIconAnimation";
import { InlineLinkPreview } from "@/components/InlineLinkPreview";
import { LazyVideo } from "@/components/LazyVideo";
import { caseStudies, caseStudyRoute } from "@/data/caseStudies";
import { ABOUT_PAGE } from "@/data/about";
import { PageIndicator } from "@/components/PageIndicator";
import { CaseStudyTuning } from "@/components/CaseStudyTuning";
import { HEADER_SETTLE_MS, HEADER_SHRINK_AT_PX, nextHeaderShrunk } from "@/lib/stickyHeader";
import { markReturningHome } from "@/hooks/useStackCollapse";
import {
  DESK_ROUTE,
  clearArrivingFromDesk,
  isDeskSession,
  noteDeskReturn,
  peekArrivingFromDesk,
  prepareDeskReturn,
} from "@/lib/deskSession";
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
// The page's margin is wide enough to hold the Home icon beside the title
// (globals.css, from 48rem), so it stays there when the header collapses
// rather than playing its shrink-away animation.
const WIDE_MARGIN_QUERY = "(min-width: 48rem)";
function subscribeWideMargin(onChange: () => void) {
  const mql = window.matchMedia(WIDE_MARGIN_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}
const getWideMargin = () => window.matchMedia(WIDE_MARGIN_QUERY).matches;
const getWideMarginOnServer = () => false;

const EXIT_ANIMATION_MS = 420;
// The first screen always shows some of the work: the long read is cut short,
// behind Read more, wherever it would push the first video lower than this
// much above the bottom of the window...
const MEDIA_PEEK_SHARE = 0.18;
const MEDIA_PEEK_MIN_PX = 120;
// ...showing at least this many lines of it, or, where even that would
// crowd the video out, none: the standfirst above already sums it up.
const READ_MORE_MIN_LINES = 2;
// Room for the Read more button before it's on the page to measure.
const READ_MORE_ESTIMATE_PX = 56;

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

// A sequence tile's media sits in its own rounded frame so a caption can
// follow it; a mosaic tile is the frame itself.
function MaybeFrame({ className, aspect, children }: { className?: string; aspect?: CaseStudyMedia["aspect"]; children: ReactNode }) {
  if (!className) return <>{children}</>;
  return <div className={className} data-aspect={aspect}>{children}</div>;
}

function MediaCaption({ number, children }: { number?: string; children: ReactNode }) {
  return (
    <figcaption className="case-study-caption font-body font-medium">
      {number && <span className="case-study-caption-number">{number}</span>}
      {children}
    </figcaption>
  );
}

// The pages as a row of dots, each naming itself in a chip above on hover
// or focus: along the foot of a phone screen, and in the footer.
function PageDots({ current }: { current: string }) {
  return (
    <>
      {RAIL_PAGES.map((page) => (
        <Link
          key={page.slug}
          href={caseStudyRoute(page)}
          aria-label={page.title}
          aria-current={page.slug === current ? "page" : undefined}
          className="group relative grid place-items-center focus-visible:outline-none"
        >
          <span
            aria-hidden="true"
            className="size-3 rounded-full transition-transform duration-200 group-hover:scale-150 group-focus-visible:scale-150"
            // The current page as on the margin rail: a bullseye, larger.
            style={page.slug === current ? {
              backgroundColor: "var(--color-cream)",
              boxShadow: `inset 0 0 0 3.5px ${page.thumbnailColor}`,
              scale: "1.3",
            } : { backgroundColor: page.thumbnailColor }}
          />
          {/* Its name on hover or focus, above the row, as the margin
              rail's chip opens beside it. Drawn from data-title so the
              name isn't in the page twice; the link already carries it. */}
          <span
            aria-hidden="true"
            data-title={page.title}
            className="pointer-events-none absolute bottom-[calc(100%+1.25rem)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-sm font-body font-bold text-ink opacity-0 transition-opacity duration-150 after:content-[attr(data-title)] group-hover:opacity-100 group-focus-visible:opacity-100"
            style={{ backgroundColor: page.thumbnailColor }}
          />
        </Link>
      ))}
    </>
  );
}

function FooterArrow({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h15m0 0-6-6m6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The footer's top within this many screen heights of the top of the window
// hides the side rail: a quarter of a screen before it scrolls into view.
const FOOTER_HIDES_RAILS_AT = 1.25;

// Every page the desk's rail offers, About last.
const RAIL_PAGES = [...caseStudies, ABOUT_PAGE];

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
    videoCaption,
  } = caseStudy;
  // Captions are numbered in page order, the film's first.
  const captionNumbers = new Map<string | number, string>();
  for (const key of [...(videoSrc && videoCaption ? ["video"] : []), ...media.flatMap((item, index) => (item.caption ? [index] : []))]) {
    captionNumbers.set(key, String(captionNumbers.size + 1).padStart(2, "0"));
  }
  const hasMedia = Boolean(videoSrc) || media.length > 0;
  const hasFacts = facts.length > 0;
  const hasBodyContent = hasFacts || Boolean(overview) || Boolean(introImage) || sections.length > 0 || hasMedia || !children;
  const router = useRouter();

  const [shrunk, setShrunk] = useState(false);
  // The settle animation fills forwards, which pins height and beats any
  // declarative rule. Once it is done the header goes back to plain CSS so the
  // scroll shrink can transition. Zoomed into from the desk's monitor, where
  // the page was already at rest, it starts settled and skips the body's
  // entrance so the handoff doesn't replay either.
  const [fromDesk] = useState(peekArrivingFromDesk);
  const [settled, setSettled] = useState(fromDesk);
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
  const longReadRef = useRef<HTMLDivElement>(null);
  const readMoreRef = useRef<HTMLButtonElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const factsRef = useRef<HTMLElement>(null);
  const factsBlockRef = useRef(0);
  const factsWideHeightRef = useRef(0);
  // How tall the long read may be for the first video to show on the first
  // screen (null when it all fits anyway), and whether the facts beside it
  // must wait behind Read more too, on a screen too short for both.
  const [longReadCap, setLongReadCap] = useState<number | null>(null);
  const [factsWait, setFactsWait] = useState(false);
  const longReadCut = longReadCap !== null && !isLongReadExpanded;

  // Read straight from the media query rather than mirrored into state by an
  // effect. False on the server, as before, so hydration is unchanged.
  const hasWideMargin = useSyncExternalStore(subscribeWideMargin, getWideMargin, getWideMarginOnServer);

  useEffect(() => {
    clearArrivingFromDesk();
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
  const leavingRef = useRef(false);
  const leave = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;

    // Entered through the desk: Home zooms back out to it instead. The page
    // rises to the top while the desk puts this case study on its monitor, so
    // the route change lands on a matching frame and the camera pulls back.
    if (isDeskSession()) {
      noteDeskReturn(`monitor:${caseStudy.slug}`);
      shrunkRef.current = false;
      setShrunk(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      const atTop = new Promise<void>((resolve) => {
        const startedAt = performance.now();
        const check = () => {
          if (window.scrollY <= 1 || performance.now() - startedAt > 900) resolve();
          else requestAnimationFrame(check);
        };
        check();
      });
      void Promise.all([atTop, prepareDeskReturn(caseStudy.slug)]).then(() =>
        router.push(DESK_ROUTE)
      );
      return;
    }

    markReturningHome(caseStudy.slug);
    setExiting(true);
    setTimeout(() => router.push("/"), EXIT_ANIMATION_MS);
  }, [caseStudy, router]);

  // Esc goes home too, the same way the Home icon does -- but not out of a
  // field someone is typing in.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]")) return;
      leave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [leave]);

  // Works out where the first video would sit with the page at rest (header at
  // its full height, scrolled to the top) and cuts the long read so it shows
  // on the first screen. Measured from things the cut doesn't move -- the
  // text's full height, the gap above the media -- so cutting it doesn't
  // change the answer.
  useEffect(() => {
    if (!hasMedia) return;
    const measure = () => {
      const longRead = longReadRef.current;
      const columns = columnsRef.current;
      const mediaSection = mediaSectionRef.current;
      const header = document.querySelector<HTMLElement>("[data-testid='case-study-header']");
      if (!longRead || !columns || !mediaSection || !header) return;
      const probe = document.createElement("div");
      probe.style.cssText = "position:absolute;visibility:hidden;height:var(--case-study-header-height)";
      document.body.append(probe);
      const restHeader = probe.offsetHeight;
      probe.remove();
      // Document positions as they'd be with the header at rest.
      const shift = restHeader - header.offsetHeight + window.scrollY;
      const textTop = longRead.getBoundingClientRect().top + shift;
      const columnsBox = columns.getBoundingClientRect();
      const gapToMedia = mediaSection.getBoundingClientRect().top - columnsBox.bottom;
      const wide = window.matchMedia("(min-width: 64rem)").matches;
      const facts = factsRef.current;
      // Heights remembered from when the facts were showing, as they can't be
      // measured while they wait behind Read more.
      if (facts?.offsetParent) {
        if (wide) factsWideHeightRef.current = facts.offsetHeight;
        else factsBlockRef.current = facts.offsetHeight + parseFloat(getComputedStyle(columns).rowGap || "0");
      }
      // Beside the text from lg, the facts can hold the media down on their own.
      const factsBottom = facts && wide ? columnsBox.top + shift + factsWideHeightRef.current : 0;
      const limit = window.innerHeight - Math.max(MEDIA_PEEK_MIN_PX, window.innerHeight * MEDIA_PEEK_SHARE) - gapToMedia;
      const fullText = longRead.scrollHeight;
      const factsBelow = wide ? 0 : factsBlockRef.current;
      if (Math.max(textTop + fullText + factsBelow, factsBottom) <= limit) {
        setLongReadCap(null);
        setFactsWait(false);
        return;
      }
      const readMore = readMoreRef.current;
      const readMoreBlock = readMore ? readMore.getBoundingClientRect().bottom - longRead.getBoundingClientRect().bottom : READ_MORE_ESTIMATE_PX;
      const lineHeight = parseFloat(getComputedStyle(longRead.querySelector(".case-study-copy") ?? longRead).lineHeight) || 28;
      // Whole lines, so the cut never slices through a row of text.
      const lines = Math.floor((limit - textTop - readMoreBlock) / lineHeight);
      const cap = lines < READ_MORE_MIN_LINES ? 0 : lines * lineHeight;
      setLongReadCap(cap >= fullText ? null : cap);
      // The facts stay beside the text unless they alone would leave less
      // than the minimum of the video showing.
      const minimumLimit = window.innerHeight - MEDIA_PEEK_MIN_PX - gapToMedia;
      setFactsWait(wide && factsBottom > minimumLimit);
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (longReadRef.current) observer?.observe(longReadRef.current);
    if (columnsRef.current) observer?.observe(columnsRef.current);
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure, () => {});
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [hasMedia, settled]);

  // The footer carries its own dots, and two sets of dots are never on screen
  // at once: the side rail and the phone row step aside from just before the
  // footer's first pixel scrolls in (a quarter of a screen early), so their
  // fade is done by the time its dots arrive.
  const footerRef = useRef<HTMLElement>(null);
  const [footerInView, setFooterInView] = useState(false);
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const footer = footerRef.current;
      if (footer) setFooterInView(footer.getBoundingClientRect().top < window.innerHeight * FOOTER_HIDES_RAILS_AT);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

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

  const footerTop = (
    <button type="button" onClick={scrollToTop} className="cursor-pointer hover:underline underline-offset-4">
      Back to top
    </button>
  );
  const footerDots = (
    <nav aria-label="Portfolio pages" className="flex gap-3">
      <PageDots current={caseStudy.slug} />
    </nav>
  );

  return (
    <>
      {/* Revealed behind the page during the explicit home transition. */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-cream" />
      {/* Localhost only: live sliders for the header's size. */}
      <CaseStudyTuning />
      {/* The same pages as the desk's rail, so any of them is a click away
          from any other: in the right margin from md, a row along the foot of
          the screen on a phone. Outside <main>, whose exit slide would carry
          fixed children with it; they fade as it leaves instead. */}
      <PageIndicator
        placement="margin"
        align="right"
        caseStudies={RAIL_PAGES}
        current={caseStudy.slug}
        fanProgress={exiting || footerInView ? 1 : 0}
        onSelect={(picked) => {
          if (picked.slug !== caseStudy.slug) router.push(caseStudyRoute(picked));
        }}
      />
      <nav
        aria-label="Portfolio pages"
        className="case-study-rail-row fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-3 rounded-full bg-cream/90 px-4 py-2.5 shadow-md ring-1 ring-ink/10 backdrop-blur md:hidden"
        style={{
          opacity: exiting || footerInView ? 0 : 1,
          pointerEvents: exiting || footerInView ? "none" : undefined,
          transition: "opacity 200ms ease-out",
        }}
      >
        <PageDots current={caseStudy.slug} />
      </nav>
      <main
        data-testid="case-study-view"
        data-exiting={exiting}
        data-from-desk={fromDesk}
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
              className="case-study-home absolute top-5"
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
                  // Steps aside while the footer's own next link is on screen.
                  style={{
                    backgroundColor: next.thumbnailColor,
                    opacity: footerInView ? 0 : undefined,
                    pointerEvents: footerInView ? "none" : undefined,
                  }}
                  aria-hidden={footerInView || undefined}
                  tabIndex={footerInView ? -1 : undefined}
                  className="case-study-next group shrink-0 inline-flex items-center rounded-full h-12"
                >
                  <span className="sr-only">Next project:</span>
                  <span
                    data-testid="case-study-next-label"
                    className="case-study-next-label font-body font-medium whitespace-nowrap overflow-hidden"
                  >
                    {next.title}
                  </span>
                  <span className="case-study-next-arrow grid place-items-center size-12 shrink-0">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
          className="case-study-body pt-10 pb-20 md:pt-16 md:pb-32"
        >
          <div
            ref={columnsRef}
            data-testid="case-study-columns"
            className={`mx-auto grid w-full max-w-[100rem] gap-x-6 gap-y-8${
              hasFacts ? " lg:grid-cols-12" : ""
            }`}
          >
            {/* Two columns on one grid: the standfirst and the long read share
                the text column, so both end on the same edge, and the facts
                stand beside them from the standfirst's top line. */}
            {oneLiner && (
              <p className="case-study-one-liner font-body font-medium lg:col-span-7">
                {oneLiner}
              </p>
            )}
            <div
              data-testid="case-study-detail"
              className={`font-body font-medium${hasFacts ? " lg:col-span-7" : ""}`}
            >
              <div
                ref={longReadRef}
                data-testid="case-study-long-read"
                data-cut={longReadCut}
                className="case-study-long-read"
                style={longReadCut ? { maxHeight: longReadCap } : undefined}
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
              {overview && (
                <p className="case-study-copy case-study-intro-copy mb-8">
                  {renderLinkedCopy(overview, overviewLink, next?.thumbnailColor)}
                </p>
              )}
              {sections.length > 0 ? (
                sections.map((section) => (
                  <section key={section.heading ?? section.body} className="case-study-copy mb-6 last:mb-0">
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
                ))
              ) : !overview && !children ? (
                <p className="case-study-copy">
                  Placeholder body copy for {caseStudy.title}. The real write-up goes
                  here: process, decisions, and the work itself.
                </p>
              ) : null}
              </div>
              {longReadCap !== null && (
                <button
                  ref={readMoreRef}
                  type="button"
                  data-testid="case-study-read-more"
                  aria-expanded={isLongReadExpanded}
                  onClick={() => setIsLongReadExpanded((expanded) => !expanded)}
                  className="mt-4 font-display text-xl underline underline-offset-4 transition-opacity hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
                >
                  {isLongReadExpanded ? "Show less" : "Read more"}
                </button>
              )}
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
              // Below lg the facts sit under the text, between it and the
              // media, so while the text is cut they wait behind Read more too.
              <aside
                ref={factsRef}
                data-testid="case-study-facts-aside"
                className={`case-study-facts-aside font-body font-medium lg:col-start-9 lg:col-span-4 lg:row-start-1 lg:sticky lg:top-32 lg:self-start${oneLiner ? " lg:row-span-2" : ""}${longReadCut ? (factsWait ? " hidden" : " max-lg:hidden") : ""}`}
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
              className="mx-auto mt-16 w-full max-w-[100rem] md:mt-24"
            >
              {videoSrc && (
                <figure>
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
                {videoCaption && <MediaCaption number={captionNumbers.get("video")}>{videoCaption}</MediaCaption>}
                </figure>
              )}
              {media.length > 0 && (
                <div
                  ref={mediaGridRef}
                  data-testid="case-study-media-grid"
                  data-layout={mediaLayout}
                  className={`grid grid-cols-2 ${
                    mediaLayout === "mosaic"
                      ? "mt-8 gap-4 md:gap-6 auto-rows-[11rem] md:auto-rows-[16rem]"
                      : "mt-8 gap-x-4 gap-y-8 md:mt-12 md:gap-x-6 md:gap-y-12"
                  }`}
                >
                  {media.map((item, index) => {
                    const span = item.span ?? "half";
                    const sequence = mediaLayout === "sequence";
                    // In a sequence the tile is a figure holding its frame and
                    // caption; a mosaic's fixed rows leave no room for one.
                    const tileLayout = sequence ? SEQUENCE_SPAN_CLASS[span] : `${SPAN_CLASS[span]} overflow-hidden rounded-2xl bg-ink/20`;
                    const frameLayout = `case-study-tile-frame overflow-hidden rounded-2xl bg-ink/20 ${item.aspect ? ASPECT_CLASS[item.aspect] : ""}`;
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
                        className={`case-study-tile ${tileLayout}`}
                      >
                        <MaybeFrame className={sequence ? frameLayout : undefined} aspect={item.aspect}>
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
                          <span className="sr-only">{item.alt}</span>
                        )}
                        </MaybeFrame>
                        {sequence && item.caption && (
                          <MediaCaption number={captionNumbers.get(index)}>{item.caption}</MediaCaption>
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

        {/* Where the page ends: one quiet row under a hairline -- back to
            top, the pages, and the next case study in the header's own
            button. */}
        <footer ref={footerRef} data-testid="case-study-footer" className="case-study-footer">
          <div className="case-study-footer-signoff">
            <div className="mx-auto grid w-full max-w-[100rem] items-center gap-6 border-t border-ink pt-7 pb-10 font-body font-medium text-[0.9375rem] md:grid-cols-[1fr_auto_1fr]">
              <div className="flex justify-center md:justify-start">{footerTop}</div>
              <div className="flex justify-center max-md:order-first">{footerDots}</div>
              {next && (
                // The header's next button, as it looks opened: it takes over
                // from that one, which steps aside while the footer is here.
                <Link
                  data-testid="case-study-footer-next"
                  href={caseStudyRoute(next)}
                  className="group inline-flex h-12 items-center justify-self-center rounded-full md:justify-self-end"
                  style={{ backgroundColor: next.thumbnailColor }}
                >
                  <span className="sr-only">Next project:</span>
                  <span className="pl-5 font-body font-medium text-base whitespace-nowrap">{next.title}</span>
                  <span className="grid size-12 shrink-0 place-items-center transition-transform duration-300 group-hover:translate-x-0.5">
                    <FooterArrow size={22} />
                  </span>
                </Link>
              )}
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
