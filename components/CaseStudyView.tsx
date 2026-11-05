"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { HomeIconAnimation } from "@/components/HomeIconAnimation";
import { InlineLinkPreview } from "@/components/InlineLinkPreview";
import { LazyVideo } from "@/components/LazyVideo";
import { PhotoZoom } from "@/components/PhotoZoom";
import { SteppedImage } from "@/components/SteppedImage";
import { caseStudies, caseStudyRoute } from "@/data/caseStudies";
import { ABOUT_PAGE, CONTACT } from "@/data/about";
import { MADE_WITH } from "@/data/madeWith";
import { PageIndicator } from "@/components/PageIndicator";
import { EmailLink } from "@/components/EmailLink";
import { CardDotField } from "@/components/CardDotField";
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
import type { CaseStudy, CaseStudyAction, CaseStudyFact, CaseStudyMedia, CaseStudyOverviewLink } from "@/data/caseStudies";
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

const CAN_HOVER_QUERY = "(hover: hover)";
function subscribeCanHover(onChange: () => void) {
  const mql = window.matchMedia(CAN_HOVER_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}
const getCanHover = () => window.matchMedia(CAN_HOVER_QUERY).matches;
const getCanHoverOnServer = () => true;

const EXIT_ANIMATION_MS = 420;
// The first screen always shows some of the work: the long read is cut short,
// behind Read more, wherever it would push the first video lower than this
// much above the bottom of the window...
const MEDIA_PEEK_SHARE = 0.18;
const MEDIA_PEEK_MIN_PX = 120;
// ...but always showing at least this many lines of it: on a short window
// the video peeks a little later rather than the story vanishing.
const READ_MORE_MIN_LINES = 4;
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

// A row is six columns wide: a full tile takes all six, a half three and a
// third two (a mosaic's tall tile counts as a half).
const SPAN_COLUMNS: Record<NonNullable<CaseStudyMedia["span"]>, number> = {
  full: 6,
  tall: 3,
  half: 3,
  third: 2,
};

export function caseStudyMediaRows(media: CaseStudyMedia[]): number[] {
  let row = 0;
  let occupiedColumns = 0;

  return media.map((item) => {
    const columns = SPAN_COLUMNS[item.span ?? "half"];
    if (occupiedColumns + columns > 6) {
      row += 1;
      occupiedColumns = 0;
    }
    const itemRow = row;
    occupiedColumns += columns;
    if (occupiedColumns === 6) {
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
  third: "col-span-1 row-span-1",
};

const SEQUENCE_SPAN_CLASS: Record<NonNullable<CaseStudyMedia["span"]>, string> = {
  full: "col-span-6",
  tall: "col-span-3",
  half: "col-span-3",
  // Phone clips read one at a time on a narrow screen, then return to a
  // compact three-up row once there is room for their captions.
  third: "col-span-6 md:col-span-2",
};

const ASPECT_CLASS: Record<NonNullable<CaseStudyMedia["aspect"]>, string> = {
  landscape: "aspect-video",
  portrait: "aspect-[9/16]",
  wide: "aspect-[3/1]",
  upright: "aspect-[4/5]",
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
            {item.href.startsWith("mailto:") ? (
              <EmailLink email={item.href.slice("mailto:".length)} className="underline underline-offset-2 hover:opacity-70">
                {item.label}
              </EmailLink>
            ) : (
              <a href={item.href} className="underline underline-offset-2 hover:opacity-70">
                {item.label}
              </a>
            )}
          </li>
        )
      )}
    </ul>
  );
}

// A sequence tile's media sits in its own rounded frame so a caption can
// follow it; a mosaic tile is the frame itself.
// A locked photo stays small: enlarging it would undo the point of its blur.
function MaybePhotoZoom({ src, alt, locked, children }: { src: string; alt: string; locked: boolean; children: React.ReactNode }) {
  if (locked) return <>{children}</>;
  return <PhotoZoom src={src} alt={alt} className="block size-full">{children}</PhotoZoom>;
}

function MaybeFrame({ className, aspect, children }: { className?: string; aspect?: CaseStudyMedia["aspect"]; children: ReactNode }) {
  if (!className) return <>{children}</>;
  return <div className={className} data-aspect={aspect}>{children}</div>;
}

// A clip's name, on the clip: hidden until the pointer is over it, then
// faded in over a soft shade along its foot; always shown without hover.
function MediaCaption({ children }: { children: ReactNode }) {
  return <figcaption className="case-study-caption font-body font-medium">{children}</figcaption>;
}

// Over blurred, unlaunched work: a lock, and why it's hidden.
function UnreleasedLabel({ title, detail, area }: NonNullable<CaseStudyMedia["unreleased"]>) {
  return (
    <figcaption
      className="case-study-unreleased font-body"
      data-area={area ? "" : undefined}
      style={area ? { left: `${area.left}%`, right: `${area.right}%` } : undefined}
    >
      <span className="case-study-unreleased-lock" aria-hidden="true">
        <svg className="boil-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </span>
      <span className="font-bold">{title}</span>
      <span className="case-study-unreleased-detail font-medium">{detail}</span>
    </figcaption>
  );
}

// About's calls to action, in the rail: two matching rows, the title and a
// detail on the left and a round button (or, for the CV, a tilted picture of
// its first page) on the right. The email (ink) copies its address; anything
// else (sand, the CV) opens in a new tab. Each row's link
// stretches over the whole row.
function ActionCard({ action }: { action: CaseStudyAction }) {
  const email = action.href.startsWith("mailto:") ? action.href.slice("mailto:".length) : null;
  return (
    <div className={`case-study-action-row ${email ? "bg-ink text-cream" : "bg-ink/[0.06] text-ink"}`}>
      <span className="min-w-0">
        <span className="case-study-action-title block font-display">{action.title}</span>
        {email ? (
          <EmailLink email={email} copiedLabel="Copied to clipboard." className="case-study-action-link mt-1.5 font-medium opacity-75">
            {action.detail}
          </EmailLink>
        ) : (
          <a href={action.href} target="_blank" rel="noopener" aria-label={`Open ${action.title} in a new tab`} className="case-study-action-link mt-1.5 block font-medium opacity-60">
            {action.detail}
          </a>
        )}
      </span>
      {action.preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={action.preview} alt="" className="case-study-action-preview" />
      ) : (
        <span
          aria-hidden="true"
          className={`grid size-12 shrink-0 place-items-center rounded-full ${email ? "bg-cream text-ink" : "bg-ink text-cream"}`}
        >
          {email ? <Envelope size={24} /> : <DownArrow size={24} />}
        </span>
      )}
    </div>
  );
}

function DownArrow({ size }: { size: number }) {
  return (
    <svg className="boil-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4v15m0 0-6-6m6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Envelope({ size }: { size: number }) {
  return (
    <svg className="boil-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5.5" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2.2" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FooterArrow({ size }: { size: number }) {
  return (
    <svg className="boil-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h15m0 0-6-6m6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FooterMadeWith({ className = "" }: { className?: string }) {
  return (
    <p className={`flex items-center gap-1.5 whitespace-nowrap pt-10 text-sm ${className}`}>
      <span className="opacity-55">Made in Stockholm with</span>
      <span className="sr-only">{` ${MADE_WITH.map((tool) => tool.name).join(", ")}`}</span>
      <span aria-hidden="true" className="flex items-center gap-2.5">
        {MADE_WITH.map((tool) => (
          <svg key={tool.name} viewBox="0 0 24 24" className="size-4 fill-current opacity-75">
            <title>{tool.name}</title>
            <path d={tool.path} />
          </svg>
        ))}
      </span>
    </p>
  );
}

// Every page the desk's rail offers, About last.
const RAIL_PAGES = [...caseStudies, ABOUT_PAGE];

export function CaseStudyView({ caseStudy, next, children }: CaseStudyViewProps) {
  // The card's field lights a few dots in the other pages' colours.
  const nextCardDotColors = useMemo(
    () => RAIL_PAGES.map((page) => page.thumbnailColor).filter((color) => color !== next?.thumbnailColor),
    [next?.thumbnailColor],
  );
  const {
    oneLiner,
    overview,
    overviewLink,
    overviewContactLinks,
    overviewStyle,
    facts = [],
    actions = [],
    introImage,
    sections = [],
    media = [],
    mediaLayout = "mosaic",
    mediaPadded = false,
    videoSrc,
    videoCaption,
  } = caseStudy;
  const hasMedia = Boolean(videoSrc) || media.length > 0;
  const hasFacts = facts.length > 0;
  // The rail holds the facts, or (About) big calls to action instead.
  const hasRail = hasFacts || actions.length > 0;
  const hasBodyContent = hasRail || Boolean(overview) || Boolean(introImage) || sections.length > 0 || hasMedia || !children;
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
  // Scroll picks one active row, not one tile within it: in a row of
  // several videos only the one under the pointer plays, and none at rest,
  // so a row never runs all its clips at once. Without hover (touch) the
  // row's first video plays instead, unless a phone stacks them: then each
  // plays as it comes into focus.
  const [hoveredTile, setHoveredTile] = useState<number | null>(null);
  const canHover = useSyncExternalStore(subscribeCanHover, getCanHover, getCanHoverOnServer);
  const titleContainerRef = useRef<HTMLHeadingElement>(null);
  const titleButtonRef = useRef<HTMLButtonElement>(null);
  const mediaSectionRef = useRef<HTMLElement>(null);
  const mediaGridRef = useRef<HTMLDivElement>(null);
  const mediaRows = caseStudyMediaRows(media);
  const hasPlayableMedia = Boolean(videoSrc) || media.some((item) => item.kind === "video");
  const longReadRef = useRef<HTMLDivElement>(null);
  const readMoreRef = useRef<HTMLButtonElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const factsRef = useRef<HTMLElement>(null);
  const factsBlockRef = useRef(0);
  // How tall the long read may be for the first video to show on the first
  // screen; null when it all fits anyway.
  const [longReadCap, setLongReadCap] = useState<number | null>(null);
  const longReadCut = longReadCap !== null && !isLongReadExpanded;

  // Read straight from the media query rather than mirrored into state by an
  // effect. False on the server, as before, so hydration is unchanged.

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
      // Below lg the facts wait behind Read more, so their height is
      // remembered from when they were showing.
      if (facts?.offsetParent && !wide) {
        factsBlockRef.current = facts.offsetHeight + parseFloat(getComputedStyle(columns).rowGap || "0");
      }
      // Beside the text from lg, the facts can hold the media down on their own.
      const factsBottom = facts && wide ? columnsBox.top + shift + facts.offsetHeight : 0;
      const limit = window.innerHeight - Math.max(MEDIA_PEEK_MIN_PX, window.innerHeight * MEDIA_PEEK_SHARE) - gapToMedia;
      const fullText = longRead.scrollHeight;
      const factsBelow = wide ? 0 : factsBlockRef.current;
      if (Math.max(textTop + fullText + factsBelow, factsBottom) <= limit) {
        setLongReadCap(null);
        return;
      }
      const readMore = readMoreRef.current;
      const readMoreBlock = readMore ? readMore.getBoundingClientRect().bottom - longRead.getBoundingClientRect().bottom : READ_MORE_ESTIMATE_PX;
      const lineHeight = parseFloat(getComputedStyle(longRead.querySelector(".case-study-copy") ?? longRead).lineHeight) || 28;
      // Whole lines, so the cut never slices through a row of text.
      // Beside taller facts the text runs down to their foot: they hold the
      // media there anyway, so the extra lines cost nothing.
      const room = Math.max(limit, factsBottom) - textTop - readMoreBlock;
      const lines = Math.floor(room / lineHeight);
      const cap = Math.max(lines, READ_MORE_MIN_LINES) * lineHeight;
      setLongReadCap(cap >= fullText ? null : cap);
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
  // at once: the side rail steps aside as the footer's list of pages scrolls
  // in. That list, not the footer's top: the next card above it repeats nothing,
  // and on a short page in a tall window it sits just under the fold at rest.
  // Rechecked as the page settles and as a resize reflows it, not only on
  // scroll, so the rail can't sit on a stale answer.
  const footerRef = useRef<HTMLElement>(null);
  const footerPagesRef = useRef<HTMLElement>(null);
  const [footerInView, setFooterInView] = useState(false);
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const pages = footerPagesRef.current;
      if (pages) setFooterInView(pages.getBoundingClientRect().top < window.innerHeight);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(check);
    if (footerRef.current?.parentElement) observer?.observe(footerRef.current.parentElement);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      observer?.disconnect();
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

  return (
    <>
      {/* Revealed behind the page during the explicit home transition. */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-cream" />
      {/* Localhost only: live sliders for the header's size. */}
      <CaseStudyTuning />
      {/* The same pages as the desk's rail, so any of them is a click away
          from any other: in the right margin from md. Not on a phone, where
          the footer lists them. Outside <main>, whose exit slide would carry
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
      <main
        data-testid="case-study-view"
        data-exiting={exiting}
        data-from-desk={fromDesk}
        // Not min-h-screen: a short page (About, with no media) doesn't need
        // padding out to a full viewport, and the fixed cream layer above
        // already covers the screen regardless of this element's real height.
        className="case-study-view bg-cream text-ink"
        style={{
          transform: exiting ? "translateY(100vh)" : undefined,
          transition: exiting
            ? `transform ${EXIT_ANIMATION_MS}ms cubic-bezier(0.4, 0, 1, 1)`
            : undefined,
          // Selected text is highlighted in the next study's colour.
          "--selection-color": next?.thumbnailColor,
        } as React.CSSProperties}
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
            <HomeIconAnimation />
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
                  // itself before you commit to it. It stays put the whole way
                  // down, footer included.
                  style={{ backgroundColor: next.thumbnailColor }}
                  className="case-study-next group shrink-0 inline-flex items-center rounded-full h-12"
                >
                  <span className="sr-only">Next project:</span>
                  <span
                    data-testid="case-study-next-label"
                    className="case-study-next-label font-body font-bold whitespace-nowrap overflow-hidden"
                  >
                    {next.title}
                  </span>
                  <span className="case-study-next-arrow grid place-items-center size-12 shrink-0">
                    {/* boil-icon: hand-drawn, like Home opposite. */}
                    <svg className="boil-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M4 12h15m0 0-6-6m6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="2.5"
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
          className="case-study-body pt-10 pb-12 md:pt-16 md:pb-16"
        >
          <div
            ref={columnsRef}
            data-testid="case-study-columns"
            className={`mx-auto grid w-full max-w-[100rem] gap-x-6 gap-y-8${
              hasRail ? " lg:grid-cols-12" : ""
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
              className={`font-body font-medium${hasRail ? " lg:col-span-7" : ""}`}
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
                <p className={`case-study-copy case-study-intro-copy mb-8${overviewStyle === "lead" ? " case-study-lead" : ""}`}>
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
                  className="mt-4 font-body font-bold text-lg underline underline-offset-4 transition-opacity hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
                >
                  {isLongReadExpanded ? "Show less" : "Read more"}
                </button>
              )}
              {overviewContactLinks && overviewContactLinks.length > 0 && (
                <p className="case-study-copy mt-8">
                  {overviewContactLinks.map((link, index) => (
                    <span key={link.href}>
                      {index > 0 && " · "}
                      {link.href.startsWith("mailto:") ? (
                        <EmailLink email={link.href.slice("mailto:".length)} className="underline underline-offset-2 hover:opacity-70">
                          {link.label}
                        </EmailLink>
                      ) : (
                        <a href={link.href} className="underline underline-offset-2 hover:opacity-70">
                          {link.label}
                        </a>
                      )}
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
                className={`case-study-facts-aside font-body font-medium lg:col-start-9 lg:col-span-4 lg:row-start-1 lg:sticky lg:top-32 lg:self-start${oneLiner ? " lg:row-span-2" : ""}${longReadCut ? " max-lg:hidden" : ""}`}
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
            {!hasFacts && actions.length > 0 && (
              <aside
                data-testid="case-study-actions"
                // From lg the rail runs the bio's full height: the email row
                // keeps its size and the CV row takes the rest.
                className="case-study-actions font-body grid content-start gap-4 lg:col-start-9 lg:col-span-4 lg:row-start-1 lg:grid-rows-[auto_1fr] lg:content-stretch"
              >
                {actions.map((action) => (
                  <ActionCard key={action.href} action={action} />
                ))}
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
                <figure className="case-study-captioned relative">
                <LazyVideo
                  data-testid="case-study-video"
                  // Its size is set before the file loads, so nothing below
                  // it jumps when it does. Every film here is 16:9.
                  className="aspect-video w-full mx-auto rounded-2xl"
                  src={videoSrc}
                  aria-label={videoCaption ?? `${caseStudy.title} film`}
                  data-playback-row="primary"
                  style={{ backgroundColor: caseStudy.thumbnailColor }}
                  playing={activePlaybackRow === "primary"}
                  muted
                  loop
                  playsInline
                  controls
                />
                {videoCaption && <MediaCaption>{videoCaption}</MediaCaption>}
                </figure>
              )}
              {media.length > 0 && (
                <div
                  ref={mediaGridRef}
                  data-testid="case-study-media-grid"
                  data-layout={mediaLayout}
                  className={`grid ${
                    mediaLayout === "mosaic"
                      ? "grid-cols-2 mt-8 gap-4 md:gap-6 auto-rows-[11rem] md:auto-rows-[16rem]"
                      : "grid-cols-6 mt-4 gap-4 md:mt-6 md:gap-6"
                  }`}
                >
                  {media.map((item, index) => {
                    const span = item.span ?? "half";
                    const sequence = mediaLayout === "sequence";
                    // In a sequence the tile is a figure holding its frame and
                    // caption; a mosaic's fixed rows leave no room for one.
                    const tileLayout = sequence ? SEQUENCE_SPAN_CLASS[span] : `${SPAN_CLASS[span]} relative overflow-hidden rounded-2xl bg-ink/20`;
                    const frameLayout = `case-study-tile-frame case-study-captioned relative overflow-hidden rounded-2xl bg-ink/20 ${item.aspect ? ASPECT_CLASS[item.aspect] : ""}`;
                    const row = mediaRows[index];
                    const paired = isPairedVideoTile(media, mediaRows, index);
                    // Alone in its row, a video plays when its row is the
                    // active one. Sharing a row, only while it's hovered --
                    // or, without hover, if it's the row's first video. Phone
                    // clips stack on a narrow screen, so without hover each
                    // takes its turn as a playback row of its own; where they
                    // sit three-up, the first wins the tie, as it always has.
                    const firstInRow = media.findIndex((other, otherIndex) => other.kind === "video" && mediaRows[otherIndex] === row) === index;
                    const ownTurn = !canHover && paired && sequence && span === "third";
                    const pairedPlays = canHover ? hoveredTile === index : ownTurn || firstInRow;
                    const playbackRow = ownTurn ? `media-${row}-${index}` : `media-${row}`;
                    const videoPlays = item.kind === "video" && activePlaybackRow === playbackRow && (!paired || pairedPlays || Boolean(item.unreleased));
                    const tileTint = item.transparent ? next?.thumbnailColor : item.tint;
                    return (
                      <figure
                        key={item.src ?? `${item.alt}-${index}`}
                        data-testid="case-study-tile"
                        data-span={span}
                        data-aspect={item.aspect}
                        className={`case-study-tile ${tileLayout}`}
                        data-playing={videoPlays || undefined}
                        style={tileTint ? ({ "--tile-tint": tileTint } as React.CSSProperties) : undefined}
                        onPointerEnter={(event) => event.pointerType !== "touch" && setHoveredTile(index)}
                        onPointerLeave={() => setHoveredTile((current) => (current === index ? null : current))}
                      >
                        <MaybeFrame className={sequence ? frameLayout : undefined} aspect={item.aspect}>
                        {item.src ? (
                          item.steps ? (
                            <SteppedImage
                              src={item.src}
                              alt={item.alt}
                              steps={item.steps}
                              playbackRow={`media-${row}`}
                              locked={Boolean(item.unreleased)}
                              // Locked, it has no chips to steer by, so it
                              // moves through its bands with its row.
                              playing={canHover && !item.unreleased ? hoveredTile === index : activePlaybackRow === `media-${row}`}
                            />
                          ) : item.kind === "video" ? (
                            <LazyVideo
                              className="size-full object-cover"
                              src={item.src}
                              transparent={item.transparent}
                              aria-label={item.alt}
                              data-playback-row={playbackRow}
                              // Blurred, a locked clip has nothing to reveal on
                              // hover, so it plays with its row.
                              playing={videoPlays}
                              showProgress={!item.unreleased}
                              muted
                              loop
                              playsInline
                            />
                          ) : (
                            <MaybePhotoZoom src={item.src} alt={item.alt} locked={Boolean(item.unreleased)}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.src}
                                alt={item.alt}
                                className="size-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            </MaybePhotoZoom>
                          )
                        ) : (
                          // No asset yet: hold the cell rather than render a
                          // broken image, so the gallery rhythm is still visible.
                          <span className="sr-only">{item.alt}</span>
                        )}
                        {sequence && item.caption && <MediaCaption>{item.caption}</MediaCaption>}
                        {item.unreleased && <UnreleasedLabel {...item.unreleased} />}
                        </MaybeFrame>
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

        {/* Where the page ends: the next case study as a big card in its own
            colour, beside an index of every page (with its dot) and how to
            get in touch, then a sign-off and back to top. */}
        <footer ref={footerRef} data-testid="case-study-footer" className="case-study-footer">
          <div className="case-study-footer-signoff">
            <div className="mx-auto w-full max-w-[100rem] pt-12 pb-10 md:pt-16">
              <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:gap-12">
                {next && (
                  <Link
                    data-testid="case-study-footer-next"
                    href={caseStudyRoute(next)}
                    className="case-study-footer-next group relative grid min-h-56 content-between gap-12 overflow-hidden rounded-3xl p-7 md:min-h-72 md:p-8"
                    style={{ backgroundColor: next.thumbnailColor, "--card-color": next.thumbnailColor } as React.CSSProperties}
                  >
                    <CardDotField colors={nextCardDotColors} />
                    <span className="relative font-body font-medium text-xs uppercase tracking-[0.08em] opacity-70">
                      <span className="sr-only">Next project: </span>
                      <span aria-hidden="true">Up next</span>
                    </span>
                    <span className="relative flex items-end justify-between gap-4">
                      <span className="case-study-footer-title font-display">{next.title}</span>
                      {/* The header's next button, in ink. Under the pointer the
                          card's dots pour into it (CardDotField) and it fills
                          with the page's cream. */}
                      <span
                        aria-hidden="true"
                        data-dot-target
                        className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-ink text-[var(--next-color)] transition-colors duration-300 group-focus-visible:text-ink group-data-[absorbing=true]:text-ink group-data-[absorbing=true]:delay-150"
                        style={{ "--next-color": next.thumbnailColor } as React.CSSProperties}
                      >
                        <span className="absolute inset-0 scale-0 rounded-full bg-cream transition-transform duration-300 ease-out group-focus-visible:scale-100 group-data-[absorbing=true]:scale-100 group-data-[absorbing=true]:delay-150" />
                        <span className="relative"><FooterArrow size={26} /></span>
                      </span>
                    </span>
                  </Link>
                )}
                {/* Beside the card (lg), dropped by the card's own padding so
                    Work and Find me line up with Up next. */}
                <div className="grid h-full justify-start gap-x-14 gap-y-10 font-body font-medium sm:grid-cols-[auto_auto] lg:grid-rows-[auto_1fr_auto] lg:py-8">
                    <nav ref={footerPagesRef} data-testid="case-study-footer-pages" aria-label="Portfolio pages">
                      <p className="text-xs uppercase tracking-[0.08em] opacity-60">Work</p>
                      <ul className="mt-3 grid gap-3">
                        {RAIL_PAGES.map((page) => (
                          <li key={page.slug}>
                            <Link
                              href={caseStudyRoute(page)}
                              aria-current={page.slug === caseStudy.slug ? "page" : undefined}
                              className="flex items-center gap-2.5 whitespace-nowrap hover:underline underline-offset-4"
                            >
                              <span
                                aria-hidden="true"
                                className="size-2.5 rounded-full"
                                // The page being read as a bullseye, as on the rail.
                                style={page.slug === caseStudy.slug
                                  ? { backgroundColor: "var(--color-cream)", boxShadow: `inset 0 0 0 2.5px ${page.thumbnailColor}`, scale: "1.3" }
                                  : { backgroundColor: page.thumbnailColor }}
                              />
                              {page.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </nav>
                    <div className="flex h-full flex-col">
                      <p className="text-xs uppercase tracking-[0.08em] opacity-60">Find me</p>
                      <ul className="mt-3 grid gap-3">
                        <li>
                          <EmailLink email={CONTACT.email} className="hover:underline underline-offset-4">
                            {CONTACT.email}
                          </EmailLink>
                        </li>
                        <li><a href={CONTACT.linkedin} className="hover:underline underline-offset-4">LinkedIn</a></li>
                        <li><a href={CONTACT.github} className="hover:underline underline-offset-4">GitHub</a></li>
                      </ul>
                      <FooterMadeWith className="mt-auto lg:hidden" />
                    </div>
                    <FooterMadeWith className="hidden lg:col-start-1 lg:row-start-3 lg:flex" />
                </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
