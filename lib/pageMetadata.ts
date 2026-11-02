import type { Metadata } from "next";
import { caseStudyRoute, type CaseStudy } from "@/data/caseStudies";

export const SITE_NAME = "Adrian Klisz";
export const SITE_TITLE = `${SITE_NAME} | Staff Designer`;
export const SITE_DESCRIPTION = "Staff Designer in Stockholm. Designer, tinkerer, zero-to-one builder.";

// A case study's own title and summary, for search results and link previews.
// The share image is the site's, named outright: a page that sets openGraph or
// twitter replaces the layout's whole entry, app/opengraph-image.jpg with it.
export function caseStudyMetadata(caseStudy: CaseStudy): Metadata {
  const title = `${caseStudy.title} | ${SITE_NAME}`;
  const description = caseStudy.oneLiner ?? (caseStudy.blurb || caseStudy.overview);
  const url = caseStudyRoute(caseStudy);
  return {
    title: caseStudy.title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", images: ["/opengraph-image.jpg"] },
    twitter: { card: "summary_large_image", title, description, images: ["/twitter-image.jpg"] },
  };
}
