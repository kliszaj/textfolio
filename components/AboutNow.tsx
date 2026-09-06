import Image from "next/image";

export type AboutNowData = {
  books: Array<{
    title: string;
    author: string;
    href: string;
    coverSrc: string;
  }>;
  playlist: {
    title: string;
    href: string;
    embedSrc: string;
  };
  game?: {
    title: string;
    platform?: string;
  };
};

type AboutNowProps = {
  now: AboutNowData;
};

// A small, deliberately updateable record of what Adrian is spending time
// with outside the portfolio. It is an editorial shelf rather than another
// grid of case studies: the book covers can overlap like physical objects,
// and Spotify keeps the listening panel genuinely current.
export function AboutNow({ now }: AboutNowProps) {
  return (
    <section
      aria-labelledby="about-now-heading"
      className="bg-cream px-6 pb-20 pt-4 md:px-10 md:pb-28 2xl:px-14"
    >
      <div className="mx-auto w-full max-w-[100rem] border-t border-ink/25 pt-8 md:pt-10">
        <h2
          id="about-now-heading"
          className="font-display text-3xl leading-none md:text-4xl"
        >
          Now
        </h2>

        <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:gap-20">
          <section aria-labelledby="currently-reading-heading">
            <p
              id="currently-reading-heading"
              className="font-body text-xs font-medium uppercase tracking-[0.08em]"
            >
              Currently reading
            </p>
            <div className="mt-5 flex items-end gap-4">
              {now.books.slice(0, 2).map((book, index) => (
                <a
                  key={book.href}
                  href={book.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${book.title} by ${book.author}`}
                  className="group relative block aspect-[3/4] w-[clamp(9.75rem,21vw,16.5rem)] overflow-hidden rounded-sm bg-ink/10 shadow-[0_14px_24px_-16px_rgba(28,28,28,0.7)] transition-transform duration-300 ease-out hover:-translate-y-2 focus-visible:-translate-y-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
                  style={{
                    transform: `rotate(${index === 0 ? -3 : 3}deg) translateY(${index === 0 ? 8 : 0}px)`,
                    transformOrigin: "bottom center",
                    zIndex: index + 1,
                  }}
                >
                  <Image
                    src={book.coverSrc}
                    alt={`${book.title} cover`}
                    fill
                    sizes="(min-width: 1024px) 12rem, 36vw"
                    className="object-cover"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-ink/85 px-3 py-2 font-body text-sm text-cream opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                    {book.title}
                  </span>
                </a>
              ))}
            </div>
            <ul className="mt-7 space-y-2 font-body text-lg leading-tight">
              {now.books.slice(0, 2).map((book) => (
                <li key={book.href}>
                  <a
                    href={book.href}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-1 underline-offset-4 transition-opacity hover:opacity-60 focus-visible:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
                  >
                    {book.title}
                  </a>{" "}
                  <span className="text-ink/65">by {book.author}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="currently-listening-heading">
            <p
              id="currently-listening-heading"
              className="font-body text-xs font-medium uppercase tracking-[0.08em]"
            >
              Currently listening
            </p>
            <iframe
              title={`${now.playlist.title} on Spotify`}
              src={now.playlist.embedSrc}
              className="mt-5 h-[352px] w-full rounded-xl border-0"
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            />
            <a
              href={now.playlist.href}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block font-body text-lg underline decoration-1 underline-offset-4 transition-opacity hover:opacity-60 focus-visible:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            >
              Open {now.playlist.title} in Spotify
            </a>
          </section>

          {now.game && (
            <section aria-labelledby="currently-playing-heading" className="lg:col-span-2">
              <p
                id="currently-playing-heading"
                className="font-body text-xs font-medium uppercase tracking-[0.08em]"
              >
                Currently playing
              </p>
              <p className="mt-2 font-display text-2xl leading-none">
                {now.game.title}
                {now.game.platform && <span className="font-body text-base"> · {now.game.platform}</span>}
              </p>
            </section>
          )}
        </div>
      </div>
    </section>
  );
}
