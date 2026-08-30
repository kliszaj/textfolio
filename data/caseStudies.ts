export type CaseStudy = {
  slug: string;
  title: string;
  thumbnailColor: string;
  blurb: string;
  // Optional showreel for the case study, played on its own page.
  videoSrc?: string;
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
    videoSrc: "/assets/jam.mp4",
  },
  {
    slug: "focals-by-north",
    title: "Focals by North",
    thumbnailColor: "#F850C0",
    blurb: "Placeholder blurb for Focals by North.",
    videoSrc: "/assets/focals.mp4",
  },
  {
    slug: "case-study-three",
    title: "Case Study Three",
    thumbnailColor: "#FFA52E",
    blurb: "Placeholder blurb for case study three.",
  },
  {
    slug: "case-study-four",
    title: "Case Study Four",
    thumbnailColor: "#219EFA",
    blurb: "Placeholder blurb for case study four.",
  },
  {
    slug: "case-study-five",
    title: "Case Study Five",
    thumbnailColor: "#FDD721",
    blurb: "Placeholder blurb for case study five.",
  },
];

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug);
}
