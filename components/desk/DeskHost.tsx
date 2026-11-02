"use client";

import { Component, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { DESK_ROUTE } from "@/lib/deskSession";

// Only fetched once someone actually visits the desk.
const DeskStage = dynamic(() => import("./DeskStage").then((module) => module.DeskStage), {
  ssr: false,
});

const noSubscription = () => () => {};
const canDrawOnServer = () => true;
// Asked once: browsers limit how many WebGL contexts a page can hold.
let webgl: boolean | undefined;
function canDraw() {
  if (webgl === undefined) {
    try {
      webgl = Boolean(document.createElement("canvas").getContext("webgl2"));
    } catch {
      webgl = false;
    }
  }
  return webgl;
}

// A desk that fails to build (a lost model, a refused context) leaves the
// landing page's links rather than a loader that never finishes.
class DeskBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("desk", error);
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Lives in the root layout so the desk survives route changes: hidden and
// paused while a case study is open, it is still there, camera zoomed into
// the monitor, when Home brings the visitor back -- no rebuild, no loading.
export function DeskHost() {
  const pathname = usePathname();
  const active = pathname === DESK_ROUTE;
  const [visited, setVisited] = useState(active);
  if (active && !visited) setVisited(true);
  const drawable = useSyncExternalStore(noSubscription, visited ? canDraw : canDrawOnServer, canDrawOnServer);
  const [crashed, setCrashed] = useState(false);
  const unavailable = !drawable || crashed;

  useEffect(() => {
    if (!unavailable) return;
    const root = document.documentElement;
    root.dataset.deskUnavailable = "1";
    return () => {
      delete root.dataset.deskUnavailable;
    };
  }, [unavailable]);

  if (!visited || unavailable) return null;
  return (
    <DeskBoundary onFail={() => setCrashed(true)}>
      <DeskStage variant="browser" active={active} />
    </DeskBoundary>
  );
}
