"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { DESK_ROUTE } from "@/lib/deskSession";

// Only fetched once someone actually visits the desk.
const DeskStage = dynamic(() => import("./DeskStage").then((module) => module.DeskStage), {
  ssr: false,
});

// Lives in the root layout so the desk survives route changes: hidden and
// paused while a case study is open, it is still there, camera zoomed into
// the monitor, when Home brings the visitor back -- no rebuild, no loading.
export function DeskHost() {
  const pathname = usePathname();
  const active = pathname === DESK_ROUTE;
  const [visited, setVisited] = useState(active);
  if (active && !visited) setVisited(true);

  if (!visited) return null;
  return <DeskStage variant="browser" active={active} />;
}
