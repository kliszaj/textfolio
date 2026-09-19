// A fact value that should render as a real link (mailto:, https:, ...)
// rather than plain text -- contact details need to be tappable, not just
// readable.
export type CaseStudyFactLink = { label: string; href: string };

// One line of the at-a-glance rail: "Role", "Design Lead". A fact can
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
  // A fact worth weight without being a link -- a stat sitting inline in
  // the sentence rather than pulled into its own rail entry.
  boldPhrases?: string[];
  bullets?: string[];
};

// A gallery tile. src is optional so the layout can be judged before the real
// assets exist; span authors the mosaic rhythm per project.
export type CaseStudyMedia = {
  src?: string;
  alt: string;
  kind?: "image" | "video";
  span?: "full" | "tall" | "half";
  aspect?: "landscape" | "portrait" | "wide";
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
  // A short, hand-trimmed restatement of the overview's opening thought,
  // set above it in the condensed display face -- authored rather than
  // sliced out of overview, so it can drop words like the project's own
  // name (already said once, in the header) without reading as a quote
  // taken out of context.
  oneLiner?: string;
  // Left column: what the work was, read in a glance.
  overview?: string;
  overviewLink?: CaseStudyOverviewLink;
  // Rendered at the bottom of the overview text block itself, not in the
  // at-a-glance rail -- for a page with nothing else worth a dedicated
  // rail (About), contact details still need a tappable home.
  overviewContactLinks?: CaseStudyFactLink[];
  facts?: CaseStudyFact[];
  // "rail" keeps facts in the sticky sidebar beside the long read (the
  // default). "columns" lifts them out into an even row above the text --
  // reads better when there are few enough facts that a column each doesn't
  // feel sparse, and pairs with mediaPadded's narrower measure.
  factsLayout?: "rail" | "columns";
  introImage?: CaseStudyIntroImage;
  // Right column: the long read, in order.
  sections?: CaseStudySection[];
  // Bottom of the page: the evidence, after both columns.
  media?: CaseStudyMedia[];
  // Sequence keeps authored aspect ratios instead of using the placeholder
  // mosaic's fixed-height rows.
  mediaLayout?: "mosaic" | "sequence";
  // Insets the media section from the same edges the reading columns sit
  // inside of, instead of running it out to the full 100rem page width --
  // a full-bleed showreel like Jam's reads as oversized next to a measure
  // built for reading.
  mediaPadded?: boolean;
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
    oneLiner: "Listen together with friends from anywhere in the world, on any device.",
    facts: [
      { label: "Role • 2023-Present", value: "Design Lead" },
      { label: "Scope", value: "Design Strategy, Product Strategy" },
      {
        label: "Impact",
        value: ["50M+ monthly users", "100M+ monthly listening hours"],
      },
    ],
    factsLayout: "columns",
    sections: [
      {
        body:
          "I was responsible for finding the right value proposition communication of the feature, designing a safe and seamless proactive nudging system (which was key to scaling and finding product-market-fit), working with other designers to adapt and scale the feature to platforms like Car, Desktop, and TV, and designing a way to enable remote Jams (i.e. when two people listening together from different locations) through Listening Activity and Messages.",
        bodyLinks: [
          {
            label: "proactive nudging",
            href: "https://en.wikipedia.org/wiki/Nudge_theory",
          },
          {
            label: "Listening Activity",
            href: "https://newsroom.spotify.com/2026-01-07/listening-activity-request-to-jam-messages-updates/",
          },
        ],
      },
      {
        body:
          "Jam is now a cornerstone of Spotify's new long-term multiplayer strategy and is one of Spotify's fastest growing features with 50 million monthly active users and over 100 million monthly listening hours.",
        bodyLink: {
          label: "multiplayer strategy",
          href: "https://newsroom.spotify.com/2026-05-21/investor-day-recap/",
        },
        boldPhrases: ["50 million", "100 million"],
      },
    ],
    videoSrc: "/assets/jam.mp4",
    mediaLayout: "sequence",
    mediaPadded: true,
    media: [
      {
        src: "/assets/jam-main-flow.mp4",
        alt: "Spotify Jam main flow",
        kind: "video",
        span: "full",
        aspect: "landscape",
      },
      {
        src: "/assets/jam-host.mp4",
        alt: "Hosting a Spotify Jam",
        kind: "video",
        span: "half",
        aspect: "portrait",
      },
      {
        src: "/assets/jam-two-choice.mp4",
        alt: "Choosing how to join a Spotify Jam",
        kind: "video",
        span: "half",
        aspect: "portrait",
      },
      {
        src: "/assets/jam-desktop.mp4",
        alt: "Spotify Jam desktop experience",
        kind: "video",
        span: "full",
        aspect: "landscape",
      },
      {
        src: "/assets/jam-tv.mp4",
        alt: "Spotify Jam TV experience",
        kind: "video",
        span: "full",
        aspect: "landscape",
      },
    ],
  },
  {
    slug: "seamless-strategy",
    title: "Seamless Strategy",
    thumbnailColor: "#F850C0",
    blurb: "Taking Spotify beyond Ubiquity",
    overview:
      "Spotify has held a competitive advantage through it's Ubiquity strategy - being available on any device you may want to listen on, from TVs, to Cars, and even some Fridges. Recently, the Ubiquity advantage is being challenged through new technologies and new connectivity standards such as Matter. As a Senior Product Designer, I co-created Spotify’s Seamless strategy: a shift from simply being available on every device to delivering coherent, seamless experiences, that multiply the value a user experiences with Spotify.",
    overviewLink: {
      label: "Matter",
      href: "https://en.wikipedia.org/wiki/Matter_(standard)",
    },
    facts: [
      { label: "Role • 2021-2022", value: "Co-Creator, Design Lead" },
      { label: "Scope", value: "Design Strategy, Product Strategy, Research" },
      { label: "Impact", value: "Co-created core business strategy that impacts over 500 million users" },
    ],
    factsLayout: "columns",
    sections: [
      {
        body:
          "During this project I was responsible for facilitating cross-organizational opportunity mapping workshops, co-authoring a data-and-insights-informed bet list, defining the key pillars of the strategy, align and socializing the strategy and design principles within the organization, and helped define a multi-year roadmap that then turned into a new Product Area.",
      },
     {
        body:
          "The Seamless Strategy remains a core focus for the business and the Product Area now employs over 60 people."
      },  
    ],
    mediaPadded: true,
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
    overviewLink: {
      label: "Meta made smartglasses creepy again",
      href: "https://www.wired.com/story/zuckoff-app-sees-meta-glasses-before-they-see-you/",
    },
    facts: [
      { label: "Role • 2018-2019", value: "Interaction Design Lead" },
      { label: "Scope", value: "0→1 interaction model, hardware-software co-design, information architecture" },
      { label: "Impact", value: "Alexa on Focals certified by Amazon, late 2018" },
    ],
    factsLayout: "columns",
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
          {
            label: "acquired by Google",
            href: "https://www.engadget.com/google-acquires-north-153625943.html",
          },
        ],
      },
    ],
    mediaLayout: "sequence",
    mediaPadded: true,
    media: [
      {
        src: "/assets/focals-home-modules.gif",
        alt: "Focals home screen module feed",
        span: "full",
        aspect: "landscape",
      },
      {
        src: "/assets/focals-sizing-scan.mp4",
        alt: "Live head scan during the mobile sizing flow",
        kind: "video",
        span: "tall",
        aspect: "portrait",
      },
      {
        src: "/assets/focals-loop-sizing.mp4",
        alt: "Loop home-sizing flow in the mobile app",
        kind: "video",
        span: "tall",
        aspect: "portrait",
      },
      {
        src: "/assets/focals-frame-styles.jpeg",
        alt: "Focals frame styles",
        span: "full",
        aspect: "wide",
      },
    ],
  },
  {
    slug: "projects-and-experiments",
    title: "Tinkering",
    thumbnailColor: "#219EFA",
    blurb: "Personal projects, small experiments, and the things I tinker with on evenings and weekends.",
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
