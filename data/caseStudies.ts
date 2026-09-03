// A fact value that should render as a real link (mailto:, https:, ...)
// rather than plain text -- contact details need to be tappable, not just
// readable.
export type CaseStudyFactLink = { label: string; href: string };

// One line of the at-a-glance rail: "Role", "Lead Designer". A fact can
// optionally be a short bulleted list when its values need separate emphasis,
// or a list of links when the values are things a reader would want to open.
export type CaseStudyFact = { label: string; value: string | string[] | CaseStudyFactLink[] };

// One beat of the long read. Headings are optional so a continuous narrative
// can still use the progressive Read more treatment without visual breaks.
export type CaseStudySection = {
  heading?: string;
  body: string;
  bullets?: string[];
};

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

// Placeholder copy: real employer/client work is not cleared for public
// viewing yet. This keeps every entry's shape (fact/section/media counts)
// identical to the real content it stands in for, so the layout renders the
// same way once the real write-ups go back in. See handoff.md.
export const caseStudies: CaseStudy[] = [
  {
    slug: "case-study-one",
    title: "Case Study One",
    thumbnailColor: "#15FF76",
    blurb: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    overview:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    facts: [
      { label: "Role", value: "Placeholder Role\n2021 – present" },
      { label: "Scope", value: "Placeholder, Placeholder, Placeholder" },
      {
        label: "Impact",
        value: ["Placeholder metric one", "Placeholder metric two"],
      },
    ],
    sections: [
      {
        body:
          "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
      },
      {
        body:
          "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
      },
      {
        body:
          "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.",
      },
    ],
    media: [
      { alt: "Placeholder image one", span: "full" },
      { alt: "Placeholder image two", span: "tall" },
      { alt: "Placeholder image three", span: "half" },
      { alt: "Placeholder image four", span: "half" },
      { alt: "Placeholder image five", span: "half" },
      { alt: "Placeholder image six", span: "tall" },
    ],
  },
  {
    slug: "case-study-two",
    title: "Case Study Two",
    thumbnailColor: "#F850C0",
    blurb: "Sed ut perspiciatis unde omnis iste natus error sit voluptatem.",
    overview: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    facts: [
      { label: "Role", value: "Placeholder Role\n2020 – 2021" },
      { label: "Scope", value: "Placeholder, Placeholder, Placeholder, Placeholder" },
      { label: "Impact", value: "Placeholder outcome statement" },
    ],
    sections: [
      {
        heading: "Placeholder heading one",
        body:
          "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.",
        bullets: [
          "Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.",
          "Et harum quidem rerum facilis est et expedita distinctio, nam libero tempore.",
          "Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet.",
        ],
      },
      {
        heading: "Placeholder heading two",
        body:
          "Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur.",
        bullets: [
          "Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.",
          "Vel illum qui dolorem eum fugiat quo voluptas nulla pariatur, at vero eos et accusamus.",
          "Et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti.",
        ],
      },
    ],
    media: [
      { alt: "Placeholder image one", span: "full" },
      { alt: "Placeholder image two", span: "half" },
      { alt: "Placeholder image three", span: "half" },
      { alt: "Placeholder image four", span: "half" },
      { alt: "Placeholder image five", span: "half" },
    ],
  },
  {
    slug: "case-study-three",
    title: "Case Study Three",
    thumbnailColor: "#FFA52E",
    blurb: "Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis.",
    overview: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    facts: [
      { label: "Role", value: "Placeholder Role\n2018 – 2019" },
      { label: "Scope", value: "Placeholder, Placeholder, Placeholder" },
      { label: "Impact", value: "Placeholder outcome statement" },
    ],
    sections: [
      {
        heading: "Placeholder heading one",
        body:
          "Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est.",
        bullets: [
          "Omnis dolor repellendus temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus.",
          "Saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.",
          "Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores.",
        ],
      },
      {
        heading: "Placeholder heading two",
        body: "Alias consequatur aut perferendis doloribus asperiores repellat.",
        bullets: [
          "Placeholder bullet describing a design decision.",
          "Placeholder bullet describing a constraint.",
          "Placeholder bullet describing an outcome.",
        ],
      },
    ],
    media: [
      { alt: "Placeholder image one", span: "full" },
      { alt: "Placeholder image two", span: "tall" },
      { alt: "Placeholder image three", span: "half" },
      { alt: "Placeholder image four", span: "half" },
      { alt: "Placeholder image five", span: "half" },
      { alt: "Placeholder image six", span: "tall" },
    ],
  },
  {
    slug: "case-study-four",
    title: "Case Study Four",
    thumbnailColor: "#219EFA",
    blurb: "Similique sunt in culpa qui officia deserunt mollitia animi.",
    overview: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    facts: [
      { label: "Role", value: "Placeholder Role\n2014 – 2016" },
      { label: "Scope", value: "Placeholder, Placeholder" },
      { label: "Impact", value: "Placeholder outcome statement" },
    ],
    sections: [
      {
        heading: "Placeholder heading one",
        body:
          "Et harum quidem rerum facilis est et expedita distinctio, nam libero tempore cum soluta nobis est eligendi optio.",
        bullets: [
          "Placeholder bullet describing a design decision.",
          "Placeholder bullet describing a testing method.",
          "Placeholder bullet describing an outcome.",
        ],
      },
      {
        heading: "Placeholder heading two",
        body: "Cumque nihil impedit quo minus id quod maxime placeat facere possimus.",
        bullets: [
          "Placeholder bullet describing product line one.",
          "Placeholder bullet describing product line two.",
          "Placeholder bullet describing the combined result.",
        ],
      },
    ],
    media: [
      { alt: "Placeholder image one", span: "full" },
      { alt: "Placeholder image two", span: "tall" },
      { alt: "Placeholder image three", span: "half" },
      { alt: "Placeholder image four", span: "half" },
      { alt: "Placeholder image five", span: "half" },
      { alt: "Placeholder image six", span: "tall" },
    ],
  },
];
export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug);
}

// About lives outside the case-study list (data/about.ts) but is shaped like
// one so it can reuse CaseStudyPreview, CaseStudyFocus, and CaseStudyView
// unchanged. This is the one place that knows its route differs from the
// /work/[slug] pattern every real case study uses.
export function caseStudyRoute(caseStudy: CaseStudy): string {
  return caseStudy.slug === "about" ? "/about" : `/work/${caseStudy.slug}`;
}

// The header arrow walks the list and wraps, so there is always a next project
// to go to and the tour never dead-ends.
export function getNextCaseStudy(slug: string): CaseStudy {
  const index = caseStudies.findIndex((c) => c.slug === slug);
  if (index < 0) return caseStudies[0];
  return caseStudies[(index + 1) % caseStudies.length];
}
