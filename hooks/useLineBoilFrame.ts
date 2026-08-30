import { useEffect, useState } from "react";

// Reads the boil frame LineBoil cycles onto <html>, so anything that wants to
// redraw itself on the same beat can do so without a second timer -- the whole
// page boils together.
export function useLineBoilFrame(frameCount: number): number {
  const [frame, setFrame] = useState(1);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => {
      if (root.dataset.lineBoil !== "on") {
        setFrame(1);
        return;
      }
      const next = Number(root.dataset.lineBoilFrame);
      setFrame(Number.isFinite(next) && next >= 1 ? ((next - 1) % frameCount) + 1 : 1);
    };

    read();
    const observer = new MutationObserver(read);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-line-boil", "data-line-boil-frame"],
    });
    return () => observer.disconnect();
  }, [frameCount]);

  return frame;
}
