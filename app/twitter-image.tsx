// Same placeholder image, under the file-name convention Twitter/X looks
// for specifically (og:image and twitter:image are separate conventions).
export { alt, size, contentType, default } from "./opengraph-image";

// Route segment config has to be declared literally in this file -- it can't
// be re-exported, Next.js parses it statically per file.
export const dynamic = "force-static";
