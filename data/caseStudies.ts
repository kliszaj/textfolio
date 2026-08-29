export type CaseStudy = {
  slug: string;
  title: string;
  thumbnailColor: string;
  blurb: string;
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "case-study-one",
    title: "Case Study One",
    thumbnailColor: "#D9C7B8",
    blurb: "Placeholder blurb for case study one.",
  },
  {
    slug: "case-study-two",
    title: "Case Study Two",
    thumbnailColor: "#C7D3D9",
    blurb: "Placeholder blurb for case study two.",
  },
  {
    slug: "case-study-three",
    title: "Case Study Three",
    thumbnailColor: "#D3D9C7",
    blurb: "Placeholder blurb for case study three.",
  },
];

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug);
}
