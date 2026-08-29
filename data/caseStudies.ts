export type CaseStudy = {
  slug: string;
  title: string;
  thumbnailColor: string;
  blurb: string;
};

// Reuses the same hex values as three of the letterTreatments' bgColor
// entries (see data/letterTreatments.ts) so a case study's peeking color
// matches a treatment color seen while hovering the name.
export const caseStudies: CaseStudy[] = [
  {
    slug: "case-study-one",
    title: "Case Study One",
    thumbnailColor: "#C1D4E4",
    blurb: "Placeholder blurb for case study one.",
  },
  {
    slug: "case-study-two",
    title: "Case Study Two",
    thumbnailColor: "#D4E4C1",
    blurb: "Placeholder blurb for case study two.",
  },
  {
    slug: "case-study-three",
    title: "Case Study Three",
    thumbnailColor: "#E4D4C1",
    blurb: "Placeholder blurb for case study three.",
  },
];

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug);
}
