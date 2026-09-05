"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { HomeIconAnimation } from "@/components/HomeIconAnimation";
import { LazyVideo } from "@/components/LazyVideo";
import { caseStudyRoute } from "@/data/caseStudies";
import { nextHeaderShrunk } from "@/lib/stickyHeader";
import { markReturningHome } from "@/hooks/useStackCollapse";
import type { CaseStudy, CaseStudyMedia } from "@/data/caseStudies";

type CaseStudyViewProps = {
  caseStudy: CaseStudy;
  // Where the header arrow leads. Optional so the view still renders standalone.
  next?: CaseStudy;
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

const SPAN_CLASS: Record<NonNullable<CaseStudyMedia["span"]>, string> = {
  full: "col-span-2 row-span-2",
  tall: "col-span-1 row-span-2",
  half: "col-span-1 row-span-1",
};

export function CaseStudyView({ caseStudy, next }: CaseStudyViewProps) {
  const { overview, facts = [], sections = [], media = [], videoSrc } = caseStudy;
  const hasMedia = Boolean(videoSrc) || media.length > 0;
  const router = useRouter();

  const [shrunk, setShrunk] = useState(false);
  // The settle animation fills forwards, which pins height and beats any
  // declarative rule. Once it is done the header goes back to plain CSS so the
  // scroll shrink can transition.
  const [settled, setSettled] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [isLongReadExpanded, setIsLongReadExpanded] = useState(false);
  const hasCollapsibleLongRead = sections.length > COLLAPSIBLE_SECTION_MINIMUM;
  const visibleSections = hasCollapsibleLongRead && !isLongReadExpanded
    ? sections.slice(0, COLLAPSED_SECTION_COUNT)
    : sections;

  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), 620);
    return () => clearTimeout(timer);
  }, []);

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
    const settle = (next: boolean) => {
      if (next === shrunkRef.current) return;
      shrunkRef.current = next;
      setShrunk(next);
    };

    const onScroll = () => {
      const currentY = window.scrollY;
      settle(nextHeaderShrunk(currentY));
    };

    settle(nextHeaderShrunk(window.scrollY));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Home is an intentional click, not a hidden scroll gesture. The page still
  // drops back onto the stack so this explicit route change carries the same
  // visual language as the sheet lift that opened it.
  const leave = useCallback(() => {
    markReturningHome(caseStudy.slug);
    setExiting(true);
    setTimeout(() => router.push("/"), EXIT_ANIMATION_MS);
  }, [caseStudy, router]);

  return (
    <>
      {/* Revealed behind the page during the explicit home transition. */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-cream" />
      <main
        data-testid="case-study-view"
        data-exiting={exiting}
        className="min-h-screen bg-cream text-ink"
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
          className="case-study-header sticky top-0 z-30 relative flex flex-col justify-end px-6 pb-5 md:px-10 md:pb-7 2xl:px-14"
          style={{ backgroundColor: caseStudy.thumbnailColor }}
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
              className="case-study-home absolute top-5 md:top-7"
            >
              {/* boil-line redraws the icon's edges each frame with the same
                  turbulence displacement as the rest of the hand-drawn marks,
                  so a plain raster icon still reads as sketched rather than
                  a clean UI glyph. */}
            <HomeIconAnimation shrunk={shrunk} />
            </Link>

            <div className="case-study-header-row flex items-end justify-between gap-6">
              <h1
                data-testid="case-study-title"
                className="case-study-title font-display leading-none"
              >
                {caseStudy.title}
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

        <div
          data-testid="case-study-body"
          className="case-study-body px-6 py-10 md:px-10 md:py-14 2xl:px-14"
        >
          {/* Overview rail beside the long read. One column on narrow screens:
              the rail reads as the intro it is, rather than a squeezed sidebar. */}
          <div
            data-testid="case-study-columns"
            className="mx-auto grid w-full max-w-[100rem] gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-20"
          >
            {/* Its own grid item, not nested in case-study-detail, so it can
                sit ahead of the facts on narrow screens (order-1) while
                staying above the long read in the right-hand column at lg
                (an explicit grid placement, since two column-2 rows need
                declaring once a third item -- this -- shares the grid). */}
            <h2 className="case-study-intro-title font-body font-bold order-1 lg:order-none lg:col-start-2 lg:row-start-1">
              {caseStudy.blurb}
            </h2>

            <aside
              data-testid="case-study-overview"
              className="font-body order-2 lg:order-none lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-32 lg:self-start"
            >
              {facts.length > 0 && (
                <dl className="case-study-facts">
                  {facts.map((fact) => (
                    <div
                      key={fact.label}
                      className="case-study-fact"
                    >
                      <dt>{fact.label}</dt>
                      <dd>
                        {Array.isArray(fact.value) ? (
                          <ul className="case-study-fact-list">
                            {fact.value.map((item) =>
                              typeof item === "string" ? (
                                <li key={item}>{item}</li>
                              ) : (
                                <li key={item.href}>
                                  <a
                                    href={item.href}
                                    className="underline underline-offset-2 hover:opacity-70"
                                  >
                                    {item.label}
                                  </a>
                                </li>
                              )
                            )}
                          </ul>
                        ) : fact.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </aside>

            {/* The page is wide, prose is not: the measure stays readable even
                when the gallery below runs the full width. Short titled beats
                keep these as an invitation to a conversation, not a full case
                study document. */}
            <div
              data-testid="case-study-detail"
              className="font-body order-3 lg:order-none lg:col-start-2 lg:row-start-2"
            >
              {overview && <p className="case-study-copy case-study-intro-copy">{overview}</p>}
              {sections.length > 0 ? (
                <>
                {visibleSections.map((section) => (
                  <section key={section.heading ?? section.body} className="case-study-copy mb-8 last:mb-0">
                    {section.heading && (
                      <h2 className="font-body font-bold text-2xl leading-none mb-3">{section.heading}</h2>
                    )}
                    <p>{section.body}</p>
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
              ) : !overview ? (
                <p className="case-study-copy">
                  Placeholder body copy for {caseStudy.title}. The real write-up goes
                  here: process, decisions, and the work itself.
                </p>
              ) : null}
            </div>
          </div>

          {/* Evidence last, and wider than the reading columns: on a big screen
              the space either side is better spent on the work than on margin. */}
          {hasMedia && (
            <section
              data-testid="case-study-media"
              className="mx-auto mt-20 w-full max-w-[110rem]"
            >
              {videoSrc && (
                <LazyVideo
                  data-testid="case-study-video"
                  className="w-full mx-auto rounded-2xl"
                  src={videoSrc}
                  style={{ backgroundColor: caseStudy.thumbnailColor }}
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                />
              )}
              {media.length > 0 && (
                <div className="mt-8 grid grid-cols-2 auto-rows-[11rem] gap-4 md:auto-rows-[16rem] md:gap-6">
                  {media.map((item, index) => {
                    const span = item.span ?? "half";
                    return (
                      <figure
                        key={item.src ?? `${item.alt}-${index}`}
                        data-testid="case-study-tile"
                        data-span={span}
                        className={`${SPAN_CLASS[span]} overflow-hidden rounded-2xl bg-ink/20`}
                      >
                        {item.src ? (
                          item.kind === "video" ? (
                            <LazyVideo
                              className="size-full object-cover"
                              src={item.src}
                              autoPlay
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
      </main>
    </>
  );
}
