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
  bodyLink?: CaseStudyOverviewLink;
  bodyLinks?: CaseStudyOverviewLink[];
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

// An editorial portrait that belongs beside the introduction rather than in
// the evidence gallery below it. Dimensions keep the layout stable while the
// local image loads.
export type CaseStudyIntroImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

// A single editorial source within the opening summary. Keeping the linked
// phrase separate from the copy avoids HTML in the content data.
export type CaseStudyOverviewLink = {
  label: string;
  href: string;
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
  overviewLink?: CaseStudyOverviewLink;
  facts?: CaseStudyFact[];
  introImage?: CaseStudyIntroImage;
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
    blurb: "Listen with friends from anywhere, on any device.",
    overview:
      "Spotify Jam lets you listen together with friends from anywhere in the world, on any device.  Jam is now one of Spotify's fastest growing features with 50 million monthly active users and over 100 million monthly listening hours.",
    facts: [
      { label: "Role", value: "Lead Designer\n2023 – present" },
      { label: "Scope", value: "Design Strategy, Product Strategy" },
      {
        label: "Impact",
        value: ["<5M to 50M monthly users", "100M+ monthly listening hours"],
      },
    ],
    sections: [
      {
        body:
          "As a Staff Product Designer, I was responsible for the value framing and positioning of the early feature concept, designing a safe and seamless proactive nudging system that really helped it take off and find product-market-fit, working with other designers in the organization to adapt the mobile experience to other platforms like Car, Desktop, and TV, and growing the remote-use of the feature by desginig a co-ordination layer via Listening Activity and Messages so that remote users would know when friends are avaialble to listen and have a way to give eachother feedback to keep sessions engaging.",
        bodyLink: {
          label: "proactive nudging",
          href: "https://en.wikipedia.org/wiki/Nudge_theory",
        },
      },
      {
        body:
          "Jam is now a cornerstone of Spotify's new long-term multiplayer strategy.",
        bodyLink: {
          label: "multiplayer strategy",
          href: "https://newsroom.spotify.com/2026-05-21/investor-day-recap/",
        },
      },
    ],
    videoSrc: "/assets/jam.mp4",
    media: [
      { alt: "Jam session across devices", span: "full" },
      { alt: "Shake to Jam prototype", span: "tall" },
      { alt: "Joining mechanisms explored", span: "half" },
      { alt: "Free user experience", span: "half" },
      { alt: "Listen Along in Messages", span: "half" },
      { alt: "Jam in car", span: "tall" },
    ],
  },
  {
    slug: "seamless-strategy",
    title: "Seamless Strategy",
    thumbnailColor: "#F850C0",
    blurb: "Taking Spotify beyond Ubiquity",
    overview:
      "For years Spotify has held a competitive advantage through it's Ubiquity strategy - being available on any device you listen on whether it's a TV, a Smart Speaker, or a Fridge.  Now, the Ubiquity advantage is being challenged through new technologies and protocols such as Matter. As a Senior Product Designer, I co-created Spotify’s Seamless strategy: a shift from simply being available on every device to delivering coherent, seamless experiences, that multiply the value a user experiences.",
    facts: [
      { label: "Role", value: "Co-Creator, Design Lead\n2021 – 2022" },
      { label: "Scope", value: "Design Strategy, Product Strategy, Research" },
      { label: "Impact", value: "Co-created core business strategy that impacts over 500 million users" },
    ],
    sections: [
      {
        body:
          "During this project I was responsible for facilitated cross-organizational opportunity mapping workshops, co-authoring a data and insights informed bet list, helped define the three pillars of the strategy, align and socialize design principles, and helped define a multi-year roadmap that then turned into a new Product Area.",
      },
     {
        body:
          "The Seamless Strategy remains a core focus for the business and the Product Area now employs over 100 people."
      },  
    ],
    media: [
      { alt: "Seamless strategy overview deck", span: "full" },
      { alt: "Cross-device opportunity mapping workshop", span: "half" },
      { alt: "DIBBs confidence-rated hypotheses", span: "half" },
      { alt: "Three pillars: Enable Devices, Moments, People", span: "half" },
      { alt: "Cross-Platform WAU metrics framework", span: "half" },
    ],
  },
  {
    slug: "focals-by-north",
    title: "Focals by North",
    thumbnailColor: "#FFA52E",
    blurb: "Designing an operating system that you're barely meant to use.",
    overview:
      "Before Meta made smartglasses creepy again, I was a Senior Product Designer at a stealth startup in Canada called North.  We had the mission of making createing the next mode of computer a pair of camera-free smartglasses with a holographic projector that created a display that only the wearer could see.",
    facts: [
      { label: "Role", value: "Interaction Design Lead\n2018 – 2019" },
      { label: "Scope", value: "0→1 interaction model, hardware-software co-design, information architecture" },
      { label: "Impact", value: "Alexa on Focals certified by Amazon, late 2018" },
    ],
    videoSrc: "/assets/focals.mp4",
    sections: [
      {
        body:
          "I joined the company early on and as Interaction Design Lead and, as at any startup, the jobs I did varied.  I did foundational research, usability testing, service design in our physical stores in New York and Toronto, defined the device's input method, helped define the hero feature-set, created an intuitive interface for users that was discreet embodied the principles of humane tech, created a new product design process that allowed us to ideate, build, and ship in one week to quickly search for product-market-fit, and I designed the mobile sizing app so users could scan their heads to size the glasses at home instead of visiting a store.",
        bodyLink: {
          label: "created a new product design process",
          href: "/archive/2019/pmf.html",
        },
      },
      {
        body:
          "In the end, Focals were not commercially successful but received strong positive reviews from Wired and TechCrunch. The company was acquired by Google in 2021, and it looks like the spirit of the glasses lives on.",
        bodyLinks: [
          {
            label: "Wired",
            href: "https://www.wired.com/review/focals-by-north-smart-glasses/",
          },
          {
            label: "TechCrunch",
            href: "https://www.youtube.com/watch?v=5eO-Y36_t08",
          },
        ],
      },
    ],
    media: [
      { alt: "Focals home screen module feed", span: "full" },
      { alt: "Loop ring controller, five-input model", span: "tall" },
      { alt: "Lens Switcher: Message and Explore", span: "half" },
      { alt: "Go navigation heads-up display", span: "half" },
      { alt: "Alexa on Focals, 110x110px templates", span: "half" },
      { alt: "Early capacitive touch pad interaction model", span: "tall" },
    ],
  },
  {
    slug: "projects-and-experiments",
    title: "Projects & Experiments",
    thumbnailColor: "#219EFA",
    blurb: "Personal projects, small experiments, and the things I tinker with on evenings and weekends.",
    overview:
      "A growing collection of things made for curiosity, practice, and the satisfaction of finding out whether an idea works.",
    facts: [
      { label: "Type", value: "Personal projects & experiments" },
      { label: "When", value: "Evenings & weekends" },
      { label: "Status", value: "Ongoing" },
    ],
    sections: [
      {
        body: "Personal projects, small experiments, and the things I tinker with on evenings and weekends.",
      },
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
