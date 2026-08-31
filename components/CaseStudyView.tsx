"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { pullOffset, pullProgress } from "@/lib/scrollExit";
import { HEADER_SHRINK_AT_PX, nextHeaderShrunk } from "@/lib/stickyHeader";
import { useScrollUpExit } from "@/hooks/useScrollUpExit";
import { markReturningHome } from "@/hooks/useStackCollapse";
import type { CaseStudy, CaseStudyMedia } from "@/data/caseStudies";

type CaseStudyViewProps = {
  caseStudy: CaseStudy;
  // Where the header arrow leads. Optional so the view still renders standalone.
  next?: CaseStudy;
};

// Matched to the homepage's own arrow, a step down so it sits inside the
// header rather than filling it.
const HOME_LABEL_SIZE = "clamp(1.05rem, 1.5vw, 1.5rem)";

// The drop back onto the stack. The inverse of the sheet lift that opened it.
const EXIT_ANIMATION_MS = 420;

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

  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), 620);
    return () => clearTimeout(timer);
  }, []);

  const shrunkRef = useRef(false);

  useEffect(() => {
    let previousY = window.scrollY;
    let changedAt = -Infinity;

    const settle = (next: boolean) => {
      if (next === shrunkRef.current) return;
      shrunkRef.current = next;
      changedAt = performance.now();
      setShrunk(next);
    };

    const onScroll = () => {
      const currentY = window.scrollY;
      settle(
        nextHeaderShrunk({
          shrunk: shrunkRef.current,
          previousY,
          currentY,
          sinceChangeMs: performance.now() - changedAt,
        })
      );
      previousY = currentY;
    };

    // A reload partway down the page has no gesture to read, so go on position.
    settle(window.scrollY > HEADER_SHRINK_AT_PX);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Pulling up at the top drops the page back onto the stack. The home button
  // stays regardless: the gesture is undiscoverable on its own, and there has
  // to be a keyboard way out.
  const leave = useCallback(() => {
    markReturningHome();
    setExiting(true);
    setTimeout(() => router.push("/"), EXIT_ANIMATION_MS);
  }, [router]);

  const pull = useScrollUpExit(leave, !exiting);
  const offset = pullOffset(pull);

  return (
    <>
      {/* Revealed behind the page as it is pulled down, so the gesture shows
          the ground it is heading back to. */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-cream" />
      <main
        data-testid="case-study-view"
        data-exiting={exiting}
        className="min-h-screen bg-cream text-ink"
        style={{
          transform: exiting ? "translateY(100vh)" : `translateY(${offset}px)`,
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
          className="case-study-header sticky top-0 z-30 flex flex-col justify-end px-6 pb-5 md:px-10 md:pb-7 2xl:px-14"
          style={{ backgroundColor: caseStudy.thumbnailColor }}
        >
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
            className="case-study-home absolute top-4 left-6 md:left-10 2xl:left-14 hover:opacity-60"
          >
            {/* .font-script carries the line boil on its own, so the word is
                drawn in the same hand as the homepage tagline. */}
            <span
              data-testid="case-study-home-label"
              className="font-script block leading-none"
              style={{ fontSize: HOME_LABEL_SIZE }}
            >
              BACK
            </span>
          </Link>

          {/* How close the pull is to committing, so the gesture is never a
              surprise: it fills as the page slides down, and empties if you
              stop short. */}
          <div
            data-testid="case-study-pull-progress"
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1 origin-left bg-ink/30"
            style={{ transform: `scaleX(${pullProgress(pull)})` }}
          />

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
                href={`/work/${next.slug}`}
                // The control wears the colour of the project it leads to, and
                // opens into a pill naming it, so the next sheet announces
                // itself before you commit to it.
                style={{ backgroundColor: next.thumbnailColor }}
                className="case-study-next group shrink-0 inline-flex items-center rounded-full h-14 md:h-16"
              >
                <span className="sr-only">Next project:</span>
                <span
                  data-testid="case-study-next-label"
                  className="case-study-next-label font-body whitespace-nowrap overflow-hidden"
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
            <aside
              data-testid="case-study-overview"
              className="font-body lg:sticky lg:top-32 lg:self-start"
            >
              {/* The blurb is this project in one line, which is exactly what
                  the rail leads with until a fuller overview is written. */}
              <p className="text-lg leading-relaxed">{overview ?? caseStudy.blurb}</p>
              {facts.length > 0 && (
                <dl className="mt-8">
                  {facts.map((fact) => (
                    <div
                      key={fact.label}
                      className="flex justify-between gap-6 border-t border-ink/15 py-3"
                    >
                      <dt className="text-sm uppercase tracking-wide opacity-60">
                        {fact.label}
                      </dt>
                      <dd className="text-sm text-right">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </aside>

            {/* The page is wide, prose is not: the measure stays readable even
                when the gallery below runs the full width. */}
            <div data-testid="case-study-detail" className="font-body max-w-[70ch]">
              {/* Plain paragraphs. At one or two of them the headings were
                  louder than the copy they introduced; the section headings in
                  the data are kept for ordering and for the writer's benefit,
                  but they are not rendered. */}
              {sections.length > 0 ? (
                sections.map((section) => (
                  <p key={section.heading} className="case-study-copy mb-8 last:mb-0">
                    {section.body}
                  </p>
                ))
              ) : (
                <p className="case-study-copy">
                  Placeholder body copy for {caseStudy.title}. The real write-up goes
                  here: process, decisions, and the work itself.
                </p>
              )}
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
                <video
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
                            <video
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
