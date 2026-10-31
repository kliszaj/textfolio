"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { DESK_EDGE, drawDeskGrain, seededRandom } from "@/lib/workspace/grain";

export type AboutShelfData = {
  books: Array<{
    title: string;
    author: string;
    href: string;
    coverSrc: string;
    // A line or two about it, under the title when it's picked up.
    note: string;
    // The spine's colours: the cover's own, more or less.
    spine: string;
    spineText: string;
  }>;
  playlist: {
    title: string;
    href: string;
    // The playlist's cover, printed on the record sleeve.
    coverSrc: string;
    // Spotify's embed player, shown once the record is out of its sleeve.
    embedSrc: string;
    note: string;
  };
  // Optional: the deck only stands on the shelf while something's being
  // played. Its face is the commander's card.
  game?: {
    title: string;
    note: string;
    commander: string;
    cardSrc: string;
    deckHref: string;
  };
};

// The scene is laid out at this size and scaled to fit its column.
const SCENE_W = 820;
const SCENE_H = 400;
const BOARD_H = 22;
const BOARD_D = 240;
// The board runs on well past the scene either side, and the viewport clips
// it, so it always spans its column: margin to margin, however wide.
const BOARD_OVERHANG = 1600;
// The width that has to fit on screen: the things and a little either side.
const FIT_W = 700;
// Books' width (the spine), height and depth, in turn.
const BOOK_SIZES: Array<[number, number, number]> = [[40, 256, 176], [34, 232, 168], [44, 262, 178], [30, 238, 170]];
// How far the shelf leans, in degrees, with the cursor at the column's edge.
const LEAN_Y = 9;
const LEAN_X = 3.6;
// The Spotify player appears once the vinyl has slid out of its sleeve.
const PLAYER_DELAY_MS = 650;
// The resting camera: a little above the shelf, looking slightly down.
const REST_X = -8;

type Item = {
  key: string;
  kind: "book" | "record" | "deck";
  label: string;
  kicker: string;
  title: string;
  // Who it's by, for a book.
  byline?: string;
  note: string;
  link?: { label: string; href: string };
};

// One flat side of a box, centred on the box's middle.
function Face({ w, h, transform, className = "", style, children }: {
  w: number; h: number; transform: string; className?: string; style?: CSSProperties; children?: ReactNode;
}) {
  return (
    <div
      className={`shelf-face ${className}`}
      style={{ width: w, height: h, left: `calc(50% - ${w / 2}px)`, top: `calc(50% - ${h / 2}px)`, transform, ...style }}
    >
      {children}
    </div>
  );
}

// A solid box, w wide, h tall and d deep. Each side can be dressed; the rest
// take `all`, shaded by which way they face.
function Box({ w, h, d, all, front, right, top, className = "" }: {
  w: number; h: number; d: number; all: CSSProperties;
  front?: { style?: CSSProperties; className?: string; children?: ReactNode };
  right?: { style?: CSSProperties; className?: string };
  top?: { style?: CSSProperties; className?: string };
  className?: string;
}) {
  return (
    <div className={`shelf-3d ${className}`} style={{ width: w, height: h }}>
      <Face w={w} h={h} transform={`translateZ(${d / 2}px)`} className={front?.className} style={{ ...all, ...front?.style }}>{front?.children}</Face>
      <Face w={w} h={h} transform={`rotateY(180deg) translateZ(${d / 2}px)`} className="shelf-shade-back" style={all} />
      <Face w={d} h={h} transform={`rotateY(90deg) translateZ(${w / 2}px)`} className={`shelf-shade-side ${right?.className ?? ""}`} style={{ ...all, ...right?.style }} />
      <Face w={d} h={h} transform={`rotateY(-90deg) translateZ(${w / 2}px)`} className="shelf-shade-side" style={all} />
      <Face w={w} h={d} transform={`rotateX(90deg) translateZ(${h / 2}px)`} className={`shelf-shade-top ${top?.className ?? ""}`} style={{ ...all, ...top?.style }} />
      <Face w={w} h={d} transform={`rotateX(-90deg) translateZ(${h / 2}px)`} className="shelf-shade-bottom" style={all} />
    </div>
  );
}

// What Adrian is into outside the portfolio, as things on a shelf at the foot
// of About: the books he's reading, this month's playlist as a record, and a
// deck for the game he's playing. Built from CSS 3D boxes rather than
// another WebGL scene, so the covers stay crisp and it costs no download. The
// shelf leans with the cursor (or, on touch, with the scroll); a thing lifts
// under the pointer and comes off the shelf when picked: a book shows its
// cover and turns with the cursor, the record slides out and spins.
export function AboutShelf({ shelf }: { shelf: AboutShelfData }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pickedRef = useRef<HTMLButtonElement | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [shown, setShown] = useState<string | null>(null);
  // The player is only mounted once the record is picked (and the vinyl is
  // out), so Spotify's iframe costs nothing until it's wanted.
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerLoaded, setPlayerLoaded] = useState(false);

  const items: Item[] = [
    ...shelf.books.map((book, index): Item => ({
      key: `book-${index}`, kind: "book", label: `${book.title} by ${book.author}`,
      kicker: "Reading", title: book.title, byline: `by ${book.author}`, note: book.note,
      link: { label: "About the book", href: book.href },
    })),
    {
      key: "record", kind: "record", label: `${shelf.playlist.title}, a playlist`,
      kicker: "Listening", title: shelf.playlist.title, note: shelf.playlist.note,
      link: { label: "Open in Spotify", href: shelf.playlist.href },
    },
    ...(shelf.game ? [{
      key: "deck", kind: "deck" as const, label: shelf.game.title,
      kicker: "Playing", title: shelf.game.title, note: shelf.game.note,
      link: { label: "See the deck", href: shelf.game.deckHref },
    }] : []),
  ];
  const caption = items.find((item) => item.key === (picked ?? shown));

  // Fit the scene to its column, and lean it with the cursor or the scroll.
  useEffect(() => {
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    if (!viewport || !stage) return;
    const fit = () => {
      // Fitted to the stretch of shelf with things on it: on a narrow screen
      // the shelf's ends run off the sides (clipped) rather than shrinking
      // everything to fit them.
      const scale = Math.min(1, viewport.clientWidth / FIT_W);
      viewport.style.setProperty("--shelf-fit", String(scale));
      viewport.style.height = `${Math.round((SCENE_H + 80) * scale)}px`;
    };
    fit();
    // Its column only changes width with the window.
    window.addEventListener("resize", fit);

    const lean = (x: number, y: number) => {
      stage.style.setProperty("--shelf-rx", `${REST_X - y * LEAN_X}deg`);
      stage.style.setProperty("--shelf-ry", `${x * LEAN_Y}deg`);
    };
    lean(0, 0);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return () => window.removeEventListener("resize", fit);

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const box = viewport.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      // A book in hand turns with the cursor, and the shelf holds still.
      const book = pickedRef.current;
      if (book?.dataset.kind === "book") {
        const model = book.querySelector<HTMLElement>(".shelf-model");
        if (model) model.style.transform = `rotateY(${-90 + x * 70}deg) rotateX(${-y * 24}deg)`;
        book.dataset.turning = "true";
        return;
      }
      stage.dataset.tracking = "true";
      lean(x, y);
    };
    const onLeave = () => {
      delete stage.dataset.tracking;
      lean(0, 0);
    };
    // No cursor on touch: the shelf turns a little as it scrolls past.
    const onScroll = () => {
      if (window.matchMedia("(hover: hover)").matches) return;
      const box = viewport.getBoundingClientRect();
      lean(-((box.top + box.height / 2) / window.innerHeight - 0.5) * 0.8, 0);
    };
    viewport.addEventListener("pointermove", onMove);
    viewport.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", fit);
      viewport.removeEventListener("pointermove", onMove);
      viewport.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // The board is the desk's own birch: its grain, drawn once, at half size.
  useEffect(() => {
    const viewport = viewportRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!viewport || !ctx) return;
    ctx.scale(0.5, 0.5);
    drawDeskGrain(ctx, seededRandom(11));
    viewport.style.setProperty("--shelf-grain", `url(${canvas.toDataURL("image/jpeg", 0.85)})`);
  }, []);

  useEffect(() => {
    if (picked !== "record") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setPlayerOpen(true), reduce ? 0 : PLAYER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [picked]);

  // Whatever's in hand goes back: it settles into its resting pose, and the
  // record's player closes with it.
  function putBack() {
    const previous = pickedRef.current;
    if (previous) {
      previous.querySelector<HTMLElement>(".shelf-model")?.style.removeProperty("transform");
      delete previous.dataset.turning;
    }
    pickedRef.current = null;
    setPicked(null);
    setPlayerOpen(false);
    setPlayerLoaded(false);
  }

  // Picking up what's already in hand puts it back.
  const pick = (element: HTMLButtonElement) => {
    const key = element.dataset.key ?? null;
    const same = picked === key;
    putBack();
    if (same || !key) return;
    pickedRef.current = element;
    setPicked(key);
  };

  // Escape puts it back.
  useEffect(() => {
    if (!picked) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") putBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Which thing is under the pointer, found from where each one is drawn
  // rather than from the browser's hit-testing, which some browsers (Safari)
  // get wrong inside a 3D scene: the scene itself takes no pointer events.
  // What's in hand comes first, as it's in front of the rest.
  const thingAt = (clientX: number, clientY: number) => {
    const things = [...(viewportRef.current?.querySelectorAll<HTMLButtonElement>(".shelf-thing") ?? [])];
    if (pickedRef.current) things.unshift(pickedRef.current);
    return things.find((thing) => {
      // The model's box, and the deck's top card, which stands up out of it.
      return [...thing.querySelectorAll(".shelf-model, .shelf-topcard")].some((part) => {
        const box = part.getBoundingClientRect();
        return clientX >= box.left && clientX <= box.right && clientY >= box.top && clientY <= box.bottom;
      });
    }) ?? null;
  };

  // Under the pointer, a thing lifts toward you and is named beside the shelf.
  const hoveredRef = useRef<HTMLButtonElement | null>(null);
  const hover = (thing: HTMLButtonElement | null) => {
    if (hoveredRef.current === thing) return;
    if (hoveredRef.current) delete hoveredRef.current.dataset.hover;
    hoveredRef.current = thing;
    if (viewportRef.current) viewportRef.current.style.cursor = thing ? "pointer" : "";
    if (!thing) return;
    thing.dataset.hover = "true";
    setShown(thing.dataset.key ?? null);
  };
  const onPointerMove = (event: ReactPointerEvent) => {
    if (event.pointerType === "mouse") hover(thingAt(event.clientX, event.clientY));
  };

  // Things stand side by side, centred on the board, books leaning close; a
  // picked one also comes toward the middle as it comes forward. Books vary
  // in size so a row of them doesn't look stamped out.
  const sized = items.map((item, index) => {
    const book = item.kind === "book" ? shelf.books[index] : null;
    const size = BOOK_SIZES[index % BOOK_SIZES.length];
    // The deck lies flat: a card's width across, a short stack high, a card's
    // length deep.
    const [w, h, d] = book ? size : item.kind === "record" ? [230, 230, 6] : [74, 22, 104];
    const gap = item.kind === "book" && items[index + 1]?.kind === "book" ? 4 : 64;
    return { item, book, w, h, d, gap };
  });
  const row = sized.reduce((total, thing, index) => total + thing.w + (index < sized.length - 1 ? thing.gap : 0), 0);
  let x = (SCENE_W - row) / 2;
  const placed = sized.map((thing) => {
    const left = x;
    x += thing.w + thing.gap;
    return { ...thing, left, z: thing.book ? -22 : thing.item.kind === "record" ? -10 : 20 };
  });

  return (
    <section aria-labelledby="about-shelf-heading" className="about-shelf bg-cream pb-20 md:pb-28">
      <h2 id="about-shelf-heading" className="sr-only">On my shelf</h2>
      <div className="mx-auto grid w-full max-w-[100rem] items-center gap-2 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <div
          ref={viewportRef}
          className="shelf-viewport"
          onPointerMove={onPointerMove}
          onPointerLeave={() => hover(null)}
          onClick={(event) => {
            // A keyboard press arrives on the thing's own button, and is
            // handled there; a pointer's click lands on the scene around it.
            if (event.target instanceof Element && event.target.closest(".shelf-thing")) return;
            const thing = thingAt(event.clientX, event.clientY);
            if (thing) pick(thing);
            else if (picked) putBack();
          }}
        >
          <div className="shelf-fit" style={{ width: SCENE_W, height: SCENE_H, marginLeft: -SCENE_W / 2, marginTop: -SCENE_H / 2 }}>
            <div ref={stageRef} className="shelf-stage" data-picking={picked !== null || undefined}>
              <div aria-hidden="true" className="shelf-at" style={{ left: -BOARD_OVERHANG, width: SCENE_W + 2 * BOARD_OVERHANG, height: BOARD_H }}>
                <Box w={SCENE_W + 2 * BOARD_OVERHANG} h={BOARD_H} d={BOARD_D} all={{ backgroundColor: DESK_EDGE }} top={{ className: "shelf-grain" }} front={{ className: "shelf-board-edge" }} />
              </div>
              {[110, SCENE_W - 128].map((left) => (
                <div key={left} aria-hidden="true" className="shelf-at" style={{ left, width: 18, height: 40, bottom: -40, transform: "translateZ(-90px)" }}>
                  <Box w={18} h={40} d={30} all={{ backgroundColor: "#2a2a2a" }} />
                </div>
              ))}
              {placed.map(({ item, book, w, h, d, left, z }) => (
                <button
                  key={item.key}
                  type="button"
                  data-kind={item.kind}
                  data-picked={picked === item.key || undefined}
                  aria-label={item.label}
                  aria-pressed={picked === item.key}
                  className="shelf-thing"
                  style={{ left, width: w, height: h, "--shelf-home": `translateZ(${z}px)`, "--shelf-reach": `${(SCENE_W / 2 - left - w / 2) * 0.35}px` } as CSSProperties}
                  data-key={item.key}
                  tabIndex={0}
                  onClick={(event) => pick(event.currentTarget)}
                  onFocus={() => setShown(item.key)}
                >
                  <span aria-hidden="true" className="shelf-shadow" style={{ left: -10, width: w + 20 }} />
                  <span aria-hidden="true" className="shelf-model" style={{ width: w, height: h }}>
                    {book && (
                      <Box
                        w={w} h={h} d={d}
                        all={{ backgroundColor: book.spine }}
                        front={{ className: "shelf-spine", style: { color: book.spineText }, children: `${book.title} · ${book.author.split(" ").at(-1)}` }}
                        right={{ className: "shelf-cover", style: { backgroundImage: `url(${book.coverSrc})` } }}
                        top={{ className: "shelf-pages" }}
                      />
                    )}
                    {item.kind === "record" && (
                      <>
                        <span className="shelf-vinyl" />
                        <Box
                          w={w} h={h} d={6} all={{ backgroundColor: "#151515" }}
                          front={{ className: "shelf-sleeve-art", style: { backgroundImage: `url(${shelf.playlist.coverSrc})` } }}
                        />
                      </>
                    )}
                    {item.kind === "deck" && (
                      // A stack of cards lying on the board: card edges along
                      // its sides, and the commander face up on top.
                      <>
                        <Box
                          w={w} h={h} d={d} all={{ backgroundColor: "#111111" }}
                          front={{ className: "shelf-deck-edges" }}
                          right={{ className: "shelf-deck-edges" }}
                        />
                        <span
                          className="shelf-topcard"
                          style={{ width: w, height: d, bottom: h, backgroundImage: `url(${shelf.game?.cardSrc})`, "--deck-half": `${d / 2}px` } as CSSProperties}
                        />
                      </>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="shelf-caption" aria-live="polite">
          {caption ? (
            <div key={caption.key} className="shelf-caption-in">
              <p className="font-body text-xs font-medium uppercase tracking-[0.08em] opacity-60">{caption.kicker}</p>
              <p className="shelf-caption-title mt-3 font-body font-bold">{caption.title}</p>
              {caption.byline && <p className="mt-1 font-body font-medium opacity-60">{caption.byline}</p>}
              <p className="case-study-copy mt-3 font-body font-medium">{caption.note}</p>
              {caption.key === "record" && picked === "record" && (
                // Out of its sleeve: the playlist itself, playable. A grey
                // card holds its place until Spotify's player has loaded.
                <div className="shelf-player mt-5 h-[152px] lg:h-[352px]" data-loaded={playerLoaded || undefined}>
                  {playerOpen && (
                    <iframe
                      title={`${shelf.playlist.title} on Spotify`}
                      src={shelf.playlist.embedSrc}
                      className="size-full rounded-xl border-0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      onLoad={() => setPlayerLoaded(true)}
                    />
                  )}
                </div>
              )}
              {caption.link && (
                <a href={caption.link.href} target="_blank" rel="noreferrer" className="mt-3 inline-block font-body font-medium underline underline-offset-4 hover:opacity-60">
                  {caption.link.label} <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          ) : (
            <div>
              <p className="font-body text-xs font-medium uppercase tracking-[0.08em] opacity-60">On the shelf</p>
              <p className="shelf-caption-title mt-3 font-body font-bold">Things I&apos;m into</p>
              <p className="case-study-copy mt-3 font-body font-medium opacity-55">Pick something up.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
