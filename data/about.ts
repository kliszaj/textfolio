import type { CaseStudy } from "./caseStudies";

// Shaped like a CaseStudy so it renders through the same CaseStudyView,
// CaseStudyPreview, and CaseStudyFocus components as a real case study --
// but it lives here, not in the caseStudies array, so it never appears in
// the page indicator, the "next project" cycle, or a /work/[slug] lookup.
export const ABOUT_PAGE: CaseStudy = {
  slug: "about",
  title: "About Me",
  thumbnailColor: "#FDD721",
  blurb: "Placeholder blurb for About Me.",
  overview: "Placeholder overview for About Me. A sentence or two on who I am and what I do.",
  facts: [
    { label: "Based in", value: "Placeholder location" },
    { label: "Currently", value: "Placeholder current role" },
    {
      label: "Say hi",
      value: [
        { label: "hello@adrianklisz.com", href: "mailto:hello@adrianklisz.com" },
        { label: "LinkedIn", href: "https://www.linkedin.com/in/adrianklisz/" },
      ],
    },
  ],
  sections: [
    {
      heading: "Placeholder heading",
      body: "Placeholder bio paragraph. Who I am, what I care about in design, and how I got here.",
    },
  ],
};
