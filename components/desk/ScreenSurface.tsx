"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { caseStudyRoute } from "@/data/caseStudies";
import type { CaseStudy } from "@/data/caseStudies";
import type { WorkspaceScene } from "@/lib/workspace/scenes";
import { BrowserChrome } from "./BrowserChrome";
import { DesktopWindows } from "./DesktopWindows";
import type { ScreenPose } from "./DeskModel";
import { SCREEN_PX, WINDOW_CHROME, type BrowserLayout, type DeskVariant, type Phase, type Viewport } from "./deskLayout";

const PAGE_FADE_OUT_MS = 220;
const READY_POLL_MS = 50;
const WALLPAPER = "#0b0b0b url(/desk/wallpaper.webp) center / cover no-repeat";
// How much of the glass's sheen goes when the room is dark.
const GLARE_NIGHT_DIM = 0.7;
const scratchFromScreen = new THREE.Vector3();

function CaseStudyCard({ caseStudy }: { caseStudy: CaseStudy }) {
  return (
    <span
      className="absolute inset-0 flex flex-col justify-between p-14 text-left text-ink"
      style={{ backgroundColor: caseStudy.thumbnailColor }}
    >
      <span className="font-body text-3xl font-medium">Case study</span>
      <span>
        <span className="block font-display text-[10rem] leading-[0.85]">{caseStudy.title}</span>
        <span className="mt-10 block max-w-[60rem] font-body text-4xl font-medium">{caseStudy.blurb}</span>
      </span>
    </span>
  );
}

function BrowserWindow({
  layout,
  viewport,
  caseStudy,
  mountPage,
  scene,
  onPageLoad,
}: {
  layout: BrowserLayout;
  viewport: Viewport;
  caseStudy: CaseStudy;
  mountPage: boolean;
  scene: WorkspaceScene;
  onPageLoad: () => void;
}) {
  // What the window is showing. A new case study plays as a navigation: the
  // old page fades out, the address bar changes, the new one rises in once loaded.
  const [page, setPage] = useState(caseStudy);
  const [pageState, setPageState] = useState<"loading" | "shown" | "leaving">("loading");
  useEffect(() => {
    if (caseStudy.slug === page.slug) return;
    const leave = window.setTimeout(() => setPageState("leaving"), 0);
    const swap = window.setTimeout(() => {
      setPage(caseStudy);
      setPageState("loading");
    }, PAGE_FADE_OUT_MS);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(swap);
    };
  }, [caseStudy, page]);
  const shown = pageState === "shown";

  // Ready once the page's HTML is parsed, not at its load event: that waits
  // for every image and video on the page (over 3s for Spotify Jam locally),
  // while the top of the page, all the monitor shows, is there long before.
  // Home on a case study waits on this (registerDeskPreparer in DeskStage).
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const markReady = () => {
    if (ready.current) return;
    ready.current = true;
    setPageState("shown");
    onPageLoad();
  };
  useEffect(() => {
    ready.current = false;
    if (!mountPage) return;
    const poll = window.setInterval(() => {
      const doc = frame.current?.contentDocument;
      if (doc && doc.URL !== "about:blank" && doc.readyState !== "loading") {
        window.clearInterval(poll);
        markReady();
      }
    }, READY_POLL_MS);
    return () => window.clearInterval(poll);
    // markReady reads only refs and stable setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountPage, page.slug]);

  return (
    <div className="absolute inset-0" style={{ background: WALLPAPER }}>
      <DesktopWindows scene={scene} />
      <div
        className="absolute overflow-hidden rounded-xl bg-cream shadow-2xl"
        style={{
          left: layout.windowLeft,
          top: layout.windowTop,
          width: layout.contentW,
          height: layout.contentH + WINDOW_CHROME,
        }}
      >
        <BrowserChrome caseStudy={page} />
        <div
          className="relative overflow-hidden"
          style={{
            width: layout.contentW,
            height: layout.contentH,
            opacity: shown ? 1 : 0,
            transform: shown ? "none" : "translateY(14px)",
            transition: shown
              ? "opacity 450ms ease-out, transform 550ms cubic-bezier(0.22, 1, 0.36, 1)"
              : `opacity ${PAGE_FADE_OUT_MS}ms ease-in`,
          }}
        >
          {/* Live but untouchable: any tap on the monitor starts the zoom. */}
          {mountPage && (
            <iframe
              ref={frame}
              key={page.slug}
              src={caseStudyRoute(page)}
              title={page.title}
              tabIndex={-1}
              // Usually long after markReady has fired from the poll above.
              onLoad={markReady}
              className="pointer-events-none absolute top-0 left-0 border-0 bg-cream"
              style={{
                width: viewport.w,
                height: viewport.h,
                transform: `scale(${layout.scale})`,
                transformOrigin: "0 0",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function ScreenSurface({
  screen,
  caseStudy,
  layout,
  viewport,
  phase,
  variant,
  mountBrowserPage,
  scene,
  darkness,
  onPageLoad,
  onOpen,
  children,
}: {
  // Laid over the monitor's desktop, above everything (the typing window).
  children?: React.ReactNode;
  darkness: number;
  screen: ScreenPose;
  caseStudy: CaseStudy;
  layout: BrowserLayout | null;
  viewport: Viewport;
  phase: Phase;
  variant: DeskVariant;
  mountBrowserPage: boolean;
  scene: WorkspaceScene;
  onPageLoad: () => void;
  onOpen: () => void;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const distanceFactor = (400 * screen.width) / SCREEN_PX.w;
  // Load the real page while the camera travels, reveal it on arrival.
  const mountPage = variant === "screen" && phase !== "idle";
  const showPage = variant === "screen" && phase === "focused";

  // HTML always draws over the canvas, so hide the screen once the orbit
  // carries the camera behind the monitor.
  useFrame(({ camera }) => {
    const el = surface.current;
    if (!el) return;
    const facing = scratchFromScreen.copy(camera.position).sub(screen.center).dot(screen.normal) > 0.02;
    el.style.visibility = facing ? "visible" : "hidden";
  });

  return (
    <group position={screen.center} quaternion={screen.quaternion}>
      <Html transform distanceFactor={distanceFactor} position={[0, 0, 0.001]} zIndexRange={[20, 0]}>
        <div
          ref={surface}
          className="relative overflow-hidden bg-cream"
          style={{ width: SCREEN_PX.w, height: SCREEN_PX.h }}
        >
          {variant === "browser" && layout ? (
            <BrowserWindow
              layout={layout}
              viewport={viewport}
              caseStudy={caseStudy}
              mountPage={mountBrowserPage}
              scene={scene}
              onPageLoad={onPageLoad}
            />
          ) : (
            <>
              {mountPage && (
                <iframe
                  src={caseStudyRoute(caseStudy)}
                  title={caseStudy.title}
                  className="absolute inset-0 size-full border-0 bg-cream"
                />
              )}
              <span
                className="absolute inset-0 transition-opacity duration-500"
                style={{ opacity: showPage ? 0 : 1 }}
              >
                <CaseStudyCard caseStudy={caseStudy} />
              </span>
            </>
          )}
          {/* A faint diagonal sheen of room light on the glass, weaker at
              night. Gone before a zoom lands, so the hand-off stays exact. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: "linear-gradient(115deg, transparent 28%, rgba(255, 255, 255, 0.07) 42%, rgba(255, 255, 255, 0.02) 52%, transparent 62%)",
              opacity: phase === "idle" ? 1 - darkness * GLARE_NIGHT_DIM : 0,
              transition: "opacity 400ms ease",
            }}
          />
          <button
            type="button"
            onClick={onOpen}
            disabled={phase !== "idle"}
            aria-label={`Open ${caseStudy.title}`}
            className="absolute inset-0 cursor-pointer"
            style={{ pointerEvents: showPage ? "none" : undefined }}
          />
          {children}
        </div>
      </Html>
    </group>
  );
}
