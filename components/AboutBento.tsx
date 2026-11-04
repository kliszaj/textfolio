"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { PhotoZoom } from "@/components/PhotoZoom";
import type { AboutBentoData } from "@/data/about";

// Under About's bio, in the media grid's columns: the portrait, Spotify's own
// player for the playlist, and the books fanned out on a tile of their own.
// All three side by side from 1200px, as tall as the portrait. Narrower, the
// books take a row of their own: Spotify's player falls back to a cramped
// layout in a tile under 352px tall, which a third of the width would be.
// Stacked on a phone.
export function AboutBento({ bento }: { bento: AboutBentoData }) {
  const { portrait, playlist, reading } = bento;
  return (
    <section aria-label="What I'm into" className="about-bento bg-cream pb-20 md:pb-28">
      <div className="mx-auto grid w-full max-w-[100rem] grid-cols-6 gap-4 md:gap-6">
        <div className="relative col-span-6 aspect-[4/5] overflow-hidden rounded-2xl bg-ink/10 md:col-span-3 min-[75rem]:col-span-2">
          <PhotoZoom src={portrait.src} alt={portrait.alt} className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={portrait.src} alt={portrait.alt} className="absolute inset-0 size-full object-cover object-[50%_30%]" />
          </PhotoZoom>
        </div>

        <div data-testid="about-bento-playlist" className="col-span-6 h-[22rem] overflow-hidden rounded-2xl bg-[#121212] md:col-span-3 md:aspect-[4/5] md:h-auto md:min-h-[22rem] min-[75rem]:col-span-2">
          <iframe
            title={`${playlist.title} on Spotify`}
            src={playlist.embedSrc}
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            className="block size-full border-0"
          />
        </div>

        <ReadingTile reading={reading} />
      </div>
    </section>
  );
}

// The books stand spine out, as CSS 3D boxes (spine, cover, pages), in a
// little scene fitted to the tile that leans with the cursor. Under the
// pointer a book lifts; picked, it comes forward and turns its cover to you,
// and the line under the books becomes its title and what it's about.
// Picking it again (or Escape) puts it back.
const BOOK_SIZES: Array<[number, number, number]> = [[40, 256, 176], [34, 232, 168], [44, 262, 178], [30, 238, 170]];
const SCENE_W = 360;
const SCENE_H = 330;
const GAP = 4;
// A browser draws a face in a 3D scene at its layout size, then stretches that
// when the scene scales it up, which blurs a picked book's cover. So the cover
// is laid out this many times over and scaled back down: the pixels are there.
const COVER_DETAIL = 3;

function ReadingTile({ reading }: { reading: AboutBentoData["reading"] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const book = picked === null ? null : reading.books[picked];

  const sized = reading.books.map((item, index) => {
    const [w, h, d] = BOOK_SIZES[index % BOOK_SIZES.length];
    return { item, w, h, d };
  });
  const row = sized.reduce((total, { w }) => total + w, 0) + GAP * (sized.length - 1);
  // Side by side, centred, a few pixels apart.
  const placed = sized.map((thing, index) => ({
    ...thing,
    left: (SCENE_W - row) / 2 + sized.slice(0, index).reduce((total, { w }) => total + w + GAP, 0),
  }));

  // Fit the scene to the tile.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const fit = () => {
      const scale = Math.min(viewport.clientWidth / SCENE_W, viewport.clientHeight / SCENE_H);
      viewport.style.setProperty("--books-fit", String(scale));
    };
    fit();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    observer?.observe(viewport);
    return () => observer?.disconnect();
  }, []);

  // Escape puts a picked book back.
  useEffect(() => {
    if (picked === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPicked(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picked]);

  // Which book is under the pointer, from where each is drawn rather than
  // the browser's hit-testing, which Safari gets wrong inside a 3D scene.
  const bookAt = (clientX: number, clientY: number) => {
    const things = [...(viewportRef.current?.querySelectorAll<HTMLElement>(".shelf-thing") ?? [])];
    const hit = things.find((thing) => {
      const box = thing.querySelector(".shelf-model")?.getBoundingClientRect();
      return box && clientX >= box.left && clientX <= box.right && clientY >= box.top && clientY <= box.bottom;
    });
    return hit ? Number(hit.dataset.index) : null;
  };

  const pick = (index: number | null) => setPicked((current) => (index === null || current === index ? null : index));
  // With a book out, a click anywhere on the books puts it back: the picked
  // book is turned to face you, so it covers the others.
  const click = (clientX: number, clientY: number) => (picked !== null ? setPicked(null) : pick(bookAt(clientX, clientY)));

  return (
    <div
      data-testid="about-bento-reading"
      className="col-span-6 grid h-[30rem] grid-rows-[minmax(0,1fr)_auto] gap-5 overflow-hidden rounded-2xl bg-ink/[0.06] p-6 min-[75rem]:col-span-2 min-[75rem]:aspect-[4/5] min-[75rem]:h-auto"
    >
      <div
        ref={viewportRef}
        className="about-books"
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse") return;
          const box = event.currentTarget.getBoundingClientRect();
          stageRef.current?.style.setProperty("--books-ry", `${((event.clientX - box.left) / box.width - 0.5) * 16}deg`);
          const index = picked === null ? bookAt(event.clientX, event.clientY) : null;
          setHovered(index);
          event.currentTarget.style.cursor = index === null && picked === null ? "" : "pointer";
        }}
        onPointerLeave={() => {
          stageRef.current?.style.removeProperty("--books-ry");
          setHovered(null);
        }}
        onClick={(event) => {
          // A keyboard press lands on the book's own button and is handled
          // there; a pointer's click lands on the scene around it.
          if (event.target instanceof Element && event.target.closest(".shelf-thing")) return;
          click(event.clientX, event.clientY);
        }}
      >
        <div className="about-books-fit" style={{ width: SCENE_W, height: SCENE_H, marginLeft: -SCENE_W / 2, marginTop: -SCENE_H / 2 }}>
          <div ref={stageRef} className="about-books-stage">
            {placed.map(({ item, w, h, d, left }, index) => (
              <button
                key={item.title}
                type="button"
                data-index={index}
                data-picked={picked === index || undefined}
                data-hover={(hovered === index && picked !== index) || undefined}
                aria-label={`${item.title} by ${item.author}`}
                aria-pressed={picked === index}
                className="shelf-thing"
                style={{ left, width: w, height: h, "--shelf-reach": `${(SCENE_W / 2 - left - w / 2) * 0.6}px` } as CSSProperties}
                onClick={(event) => {
                  event.stopPropagation();
                  // A keyboard press picks this book; a pointer's click is
                  // placed like any other.
                  if (event.detail === 0) pick(index);
                  else click(event.clientX, event.clientY);
                }}
              >
                <span aria-hidden="true" className="shelf-shadow" style={{ left: -10, width: w + 20 }} />
                <span aria-hidden="true" className="shelf-model" style={{ width: w, height: h }}>
                  <Box
                    w={w} h={h} d={d}
                    all={{ backgroundColor: item.spine }}
                    front={{ className: "shelf-spine", style: { color: item.spineText }, children: `${item.title} · ${item.author.split(" ").at(-1)}` }}
                    right={{ className: "shelf-cover", style: { backgroundImage: `url(${item.coverSrc})` } }}
                    top={{ className: "shelf-pages" }}
                  />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Each change of book comes in afresh, out of a blur, like the desk's
          name and clock. */}
      <div aria-live="polite" key={picked ?? "none"} className="about-books-caption flex min-h-[5.5rem] flex-col justify-end">
        {book ? (
          <>
            <span className="block font-body text-xl font-bold leading-tight">{book.title}</span>
            <span className="mt-0.5 block font-medium text-ink/60">{book.author}</span>
            <span className="mt-2 block font-medium leading-snug">
              {book.note}{" "}
              <a href={book.href} target="_blank" rel="noopener" className="whitespace-nowrap underline underline-offset-2 hover:opacity-70">
                More<span aria-hidden="true"> ↗</span>
              </a>
            </span>
          </>
        ) : (
          // Quiet at rest: the site's small grey label, like the facts'.
          <span className="block text-xs uppercase tracking-[0.08em] text-ink/60">{reading.title}</span>
        )}
      </div>
    </div>
  );
}

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
function Box({ w, h, d, all, front, right, top }: {
  w: number; h: number; d: number; all: CSSProperties;
  front?: { style?: CSSProperties; className?: string; children?: ReactNode };
  right?: { style?: CSSProperties; className?: string };
  top?: { style?: CSSProperties; className?: string };
}) {
  return (
    <div className="shelf-3d" style={{ width: w, height: h }}>
      <Face w={w} h={h} transform={`translateZ(${d / 2}px)`} className={front?.className} style={{ ...all, ...front?.style }}>{front?.children}</Face>
      <Face w={w} h={h} transform={`rotateY(180deg) translateZ(${d / 2}px)`} className="shelf-shade-back" style={all} />
      <Face w={d * COVER_DETAIL} h={h * COVER_DETAIL} transform={`rotateY(90deg) translateZ(${w / 2}px) scale(${1 / COVER_DETAIL})`} className={`shelf-shade-side ${right?.className ?? ""}`} style={{ ...all, ...right?.style }} />
      <Face w={d} h={h} transform={`rotateY(-90deg) translateZ(${w / 2}px)`} className="shelf-shade-side" style={all} />
      <Face w={w} h={d} transform={`rotateX(90deg) translateZ(${h / 2}px)`} className={`shelf-shade-top ${top?.className ?? ""}`} style={{ ...all, ...top?.style }} />
      <Face w={w} h={d} transform={`rotateX(-90deg) translateZ(${h / 2}px)`} className="shelf-shade-bottom" style={all} />
    </div>
  );
}
