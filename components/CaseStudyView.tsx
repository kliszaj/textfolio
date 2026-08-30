"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { pullOffset, pullProgress } from "@/lib/scrollExit";
import { useScrollUpExit } from "@/hooks/useScrollUpExit";
import { markReturningHome } from "@/hooks/useStackCollapse";
import type { CaseStudy, CaseStudyMedia } from "@/data/caseStudies";

type CaseStudyViewProps = {
  caseStudy: CaseStudy;
  // Where the header arrow leads. Optional so the view still renders standalone.
  next?: CaseStudy;
};

// How far down the page the header collapses to its compact bar.
const SHRINK_AT_PX = 120;

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

  useEffect(() => {
    const onScroll = () => setShrunk(window.scrollY > SHRINK_AT_PX);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
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
          <Link
            data-testid="case-study-home"
            href="/"
            aria-label="Home"
            // Same arrival either way: the stack folds shut rather than being
            // found already closed.
            onClick={markReturningHome}
            className="absolute top-5 left-6 md:left-10 2xl:left-14 transition-opacity hover:opacity-60"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 11.5 12 4l9 7.5M6 10v9h12v-9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
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

          <div className="flex items-end justify-between gap-6">
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
                <span className="grid place-items-center size-14 md:size-16 shrink-0">
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
              {sections.length > 0 ? (
                sections.map((section) => (
                  <section key={section.heading} className="mb-12 last:mb-0">
                    <h2 className="font-display text-2xl md:text-3xl">{section.heading}</h2>
                    <p className="mt-4 text-lg leading-relaxed">{section.body}</p>
                  </section>
                ))
              ) : (
                <p className="text-lg leading-relaxed">
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
