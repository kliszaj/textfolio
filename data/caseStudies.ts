// One line of the at-a-glance rail: "Role", "Lead Designer".
export type CaseStudyFact = { label: string; value: string };

// One beat of the long read. The headings are deliberately free text rather
// than a fixed enum so a write-up can follow the shape of its own story.
export type CaseStudySection = { heading: string; body: string };

// A gallery tile. src is optional so the layout can be judged before the real
// assets exist; span authors the mosaic rhythm per project.
export type CaseStudyMedia = {
  src?: string;
  alt: string;
  kind?: "image" | "video";
  span?: "full" | "tall" | "half";
};

export type CaseStudy = {
  slug: string;
  title: string;
  thumbnailColor: string;
  blurb: string;
  // Optional showreel for the case study, played on its own page.
  videoSrc?: string;
  // Left column: what the work was, read in a glance.
  overview?: string;
  facts?: CaseStudyFact[];
  // Right column: the long read, in order.
  sections?: CaseStudySection[];
  // Bottom of the page: the evidence, after both columns.
  media?: CaseStudyMedia[];
};

// Post-it brights: each sheet in the fanned stack reads as a stuck note, and
// the same colour carries through to that case study's own page. These are
// deliberately independent of the letterTreatments bgColors -- the name-hover
// palette and the paper-stack palette are separate systems.
export const caseStudies: CaseStudy[] = [
  {
    slug: "spotify-jam",
    title: "Spotify Jam",
    thumbnailColor: "#15FF76",
    blurb: "Placeholder blurb for Spotify Jam.",
    overview: "Placeholder overview for Spotify Jam. One or two sentences on what this project was and why it mattered.",
    facts: [
      { label: "Role", value: "Placeholder role" },
      { label: "Timeline", value: "Placeholder timeline" },
      { label: "Team", value: "Placeholder team" },
      { label: "Scope", value: "Placeholder scope" },
    ],
    sections: [
      {
        heading: "Placeholder heading",
        body: "Placeholder detail paragraph for Spotify Jam. One or two paragraphs of the real story go here: the problem, what was tried, and what changed.",
      },
      {
        heading: "Placeholder heading two",
        body: "Placeholder second paragraph for Spotify Jam. The trade-off that was made, and what it bought.",
      },
    ],
    media: [
      { alt: "Placeholder hero image", span: "full" },
      { alt: "Placeholder tall image", span: "tall" },
      { alt: "Placeholder image", span: "half" },
      { alt: "Placeholder image", span: "half" },
      { alt: "Placeholder image", span: "half" },
      { alt: "Placeholder tall image", span: "tall" },
    ],
    videoSrc: "/assets/jam.mp4",
  },
  {
    slug: "focals-by-north",
    title: "Focals by North",
    thumbnailColor: "#F850C0",
    blurb: "Placeholder blurb for Focals by North.",
    overview: "Placeholder overview for Focals by North. One or two sentences on what this project was and why it mattered.",
    facts: [
      { label: "Role", value: "Placeholder role" },
      { label: "Timeline", value: "Placeholder timeline" },
      { label: "Team", value: "Placeholder team" },
      { label: "Scope", value: "Placeholder scope" },
    ],
    sections: [
      {
        heading: "Placeholder heading",
        body: "Placeholder detail paragraph for Focals by North. One or two paragraphs of the real story go here: the problem, what was tried, and what changed.",
      },
      {
        heading: "Placeholder heading two",
        body: "Placeholder second paragraph for Focals by North. The trade-off that was made, and what it bought.",
      },
    ],
    media: [
      { alt: "Placeholder hero image", span: "full" },
      { alt: "Placeholder tall image", span: "tall" },
      { alt: "Placeholder image", span: "half" },
      { alt: "Placeholder image", span: "half" },
      { alt: "Placeholder image", span: "half" },
      { alt: "Placeholder tall image", span: "tall" },
    ],
    videoSrc: "/assets/focals.mp4",
  },
  {
    slug: "case-study-three",
    title: "Case Study Three",
    thumbnailColor: "#FFA52E",
    blurb: "Placeholder blurb for case study three.",
    overview: "Placeholder overview for Case Study Three. One or two sentences on what this project was and why it mattered.",
    facts: [
      { label: "Role", value: "Placeholder role" },
      { label: "Timeline", value: "Placeholder timeline" },
      { label: "Team", value: "Placeholder team" },
      { label: "Scope", value: "Placeholder scope" },
    ],
    sections: [
      {
        heading: "Placeholder heading",
        body: "Placeholder detail paragraph for Case Study Three. One or two paragraphs of the real story go here: the problem, what was tried, and what changed.",
      },
      {
        heading: "Placeholder heading two",
        body: "Placeholder second paragraph for Case Study Three. The trade-off that was made, and what it bought.",
      },
    ],
    media: [
      { alt: "Placeholder hero image", span: "full" },
      { alt: "Placeholder tall image", span: "tall" },
      { alt: "Placeholder image", span: "half" },
      { alt: "Placeholder image", span: "half" },
      { alt: "Placeholder image", span: "half" },
      { alt: "Placeholder tall image", span: "tall" },
    ],
  },
  {
    slug: "case-study-four",
    title: "Case Study Four",
    thumbnailColor: "#219EFA",
    blurb: "Placeholder blurb for case study four.",
    overview: "Placeholder overview for Case Study Four. One or two sentences on what this project was and why it mattered.",
    facts: [
      { label: "Role", value: "Placeholder role" },
      { label: "Timeline", value: "Placeholder timeline" },
      { label: "Team", value: "Placeholder team" },
      { label: "Scope", value: "Placeholder scope" },
    ],
    sections: [
      {
        heading: "Placeholder heading",
        body: "Placeholder detail paragraph for Case Study Four. One or two paragraphs of the real story go here: the problem, what was tried, and what changed.",
      },
      {
        heading: "Placeholder heading two",
        body: "Placeholder second paragraph for Case Study Four. The trade-off that was made, and what it bought.",
      },
    ],
    media: [
      { alt: "Placeholder hero image", span: "full" },
      { alt: "Placeholder tall image", span: "tall" },
      { alt: "Placeholder image", span: "half" },
      { alt: "Placeholder image", span: "half" },
      { alt: "Placeholder image", span: "half" },
      { alt: "Placeholder tall image", span: "tall" },
    ],
  },
  {
    slug: "case-study-five",
    title: "Case Study Five",
    thumbnailColor: "#FDD721",
    blurb: "Placeholder blurb for case study five.",
    overview: "Placeholder overview for Case Study Five. One or two sentences on what this project was and why it mattered.",
    facts: [
      { label: "Role", value: "Placeholder role" },
      { label: "Timeline", value: "Placeholder timeline" },
      { label: "Team", value: "Placeholder team" },
      { label: "Scope", value: "Placeholder scope" },
    ],
    sections: [
      {
        heading: "Placeholder heading",
        body: "Placeholder detail paragraph for Case Study Five. One or two paragraphs of the real story go here: the problem, what was tried, and what changed.",
      },
      {
        heading: "Placeholder heading two",
        body: "Placeholder second paragraph for Case Study Five. The trade-off that was made, and what it bought.",
      },
    ],
    media: [
      { alt: "Placeholder hero image", span: "full" },
      { alt: "Placeholder tall image", span: "tall" },
      { alt: "Placeholder image", span: "half" },
      { alt: "Placeholder image", span: "half" },
      { alt: "Placeholder image", span: "half" },
      { alt: "Placeholder tall image", span: "tall" },
    ],
  },
];

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug);
}

// The header arrow walks the list and wraps, so there is always a next project
// to go to and the tour never dead-ends.
export function getNextCaseStudy(slug: string): CaseStudy {
  const index = caseStudies.findIndex((c) => c.slug === slug);
  if (index < 0) return caseStudies[0];
  return caseStudies[(index + 1) % caseStudies.length];
}
