import type { MetadataRoute } from "next";
import { ABOUT_PAGE } from "@/data/about";
import { caseStudies, caseStudyRoute } from "@/data/caseStudies";

const SITE_URL = "https://adrianklisz.com";

export const dynamic = "force-static";

// The real pages only: the desk spikes and layout labs stay out of it.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL },
    ...[...caseStudies, ABOUT_PAGE].map((page) => ({ url: `${SITE_URL}${caseStudyRoute(page)}` })),
  ];
}
