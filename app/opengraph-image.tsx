import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// A placeholder for how the site looks when a link to it is shared (Slack,
// iMessage, LinkedIn, ...). Statically generated at build time -- no request
// data involved -- so it works under `output: "export"`. Swap for something
// more considered later; this just stops the preview from being blank.
export const alt = "Adrian — Designer, tinkerer, zero-to-one builder";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Required for this route under `output: "export"` -- there is no request
// data involved, so it can only ever be the one static image built once.
export const dynamic = "force-static";

const ppFrama = await readFile(join(process.cwd(), "app/fonts/PPFrama-Black.otf"));

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F5EDE6",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 180,
            fontFamily: "PP Frama",
            fontWeight: 900,
            color: "#1C1C1C",
            lineHeight: 1,
          }}
        >
          ADRIAN
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 34,
            marginTop: 28,
            color: "#5B5B5B",
          }}
        >
          Designer, tinkerer, zero-to-one builder
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "PP Frama", data: ppFrama, style: "normal", weight: 900 }],
    }
  );
}
