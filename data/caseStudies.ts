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

// An editorial portrait that belongs beside the introduction rather than in
// the evidence gallery below it. Dimensions keep the layout stable while the
// local image loads.
export type CaseStudyIntroImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
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
    blurb: "Making music multiplayer: the road the 50M monthly users.",
    overview:
      "Spotify Jam is a simple-to-use experience for listening together with friends, anywhere in the world, on any device.  Jam is now one of Spotify's fastest growing features with 50 million monthly active users and over 100 million monthly listening hours.  Jam is now a cornerstone of Spotify's 10 year multplayer strategy that was announted a Investor Days 2026.",
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
          "Jam started as a set of fragmented beta listneing together features that user's weren't understading how to use or why they would use them.  The value proposition at the time was around shared control of devices and users didn't see much value in that. We used mixed-methods insights to consoldiate the disparate features into one holsitic experience that was focused around people - listening together and sharing a social moment powered by music with those who matter most. We also advoated to give the feature a branded name, something that they could remember and talk about together - 'Let's start a Jam'. I was the design lead for the core mobile experience but I worked closely with platform designers to adapt it to Car, Desktop, and TV. After launch, Jam found some product-market fit in shared physical spaces such as living rooms and cars but we knew we had to make discovering and joining Jams even easier.",
      },
      {body:
        "Using principles from choice architecture and behavioural economics, we aligned on a strategy if proactively inviting prospective listening nearby - this became our growth engine: when one person started listening on a shared device, the people around them could join without needing to search, scan, or ask for a link. The interaction looked simple, but the initial invitation system was built on a series of complicated heuristics and signals."
      },
      {
        body:
          "Seamless joining only works if both hosts and guests feel in control. As we saw the proactive invitation strategy working, we knew we needed to upgrade it to make it more relevant and less interruptive. The current system builds on the first one that includes ML, social graphs, proximity, and user habits. We designed the privacy model around explicit consent, clear session boundaries, and host controls over who could join, contribute, or stay.",
      },
      {
        body:
          "Once we had strong product-market-fit for in-person listening, we focused on growing Jam for users who want to listen remotely. In person Jams have the benefit of allowing all participatns to communicate with eachother through language.  Remote Jams were missing a facilitation layer - who's available to listen? How do I know they're not busy? What to they want to listen to? I working across the organization to evolve Messaging, and Listening Activity to give people ways to notice, coordinate, and join one another when they were apart.",
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
    blurb: "Taking Spotify beyond ubiquity",
    overview:
      "Racing an expiration date: the strategy that grew into a 100-person Product Area.",
    facts: [
      { label: "Role", value: "Co-Creator, Design Lead\n2021 – 2022" },
      { label: "Scope", value: "Design Strategy, Product Strategy, Research" },
      { label: "Impact", value: "New Product Area created · still an active core strategy four years later" },
    ],
    sections: [
      {
        body:
          "I co-created Spotify’s Seamless strategy: a shift from simply being available on every device to delivering coherent, seamless experiences, that multiply the value a user experiences.",
      },
      {
        body:
          "Spotify had tried cross-device strategy before. The internal record was blunt about why it failed: no team was structured or resourced to own it.",
        bullets: [
          "I argued against a central team owning the whole proposition. Device teams kept ownership of their surfaces, while Seamless set shared principles.",
          "I co-authored DIBBs, a confidence framework that funded high-confidence bets and staged unproven ideas for validation instead of shipping them on faith.",
          "One staged bet, Enable People, became foundational research and later Jam. Adoption took time across six functions, but the strategy was still active four years later.",
        ],
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
    blurb: "Defining how you'd navigate a computer that has no screen to speak of, before a single feature could be designed.",
    overview:
      "Designing an operating system for a screen you can't look down at.",
    facts: [
      { label: "Role", value: "Interaction Design Lead\n2018 – 2019" },
      { label: "Scope", value: "0→1 interaction model, hardware-software co-design, information architecture" },
      { label: "Impact", value: "Alexa on Focals certified by Amazon, late 2018" },
    ],
    videoSrc: "/assets/focals.mp4",
    sections: [
      {
        heading: "One feed, one ring, no app grid",
        body:
          "Focals had no touchscreen and no keyboard. It had Loop, a physical ring with five inputs, and a transparent display roughly the size of a postage stamp.",
        bullets: [
          "A phone-style app grid did not fit the hardware. I led the core model: one priority-ordered feed of modules, navigated with Loop's five inputs.",
          "The feed made real decisions. Modules reordered as their priority changed, so a calendar event could rise to the top as it got closer.",
          "We prototyped a capacitive touch pad with a full gesture vocabulary, then chose the discrete ring. Lens Switcher peek was scoped out of v1.0 so the core could ship.",
        ],
      },
      {
        heading: "What had to work on five inputs",
        body:
          "Every feature Focals shipped had to fit inside that interaction model.",
        bullets: [
          "Go, the heads-up navigation experience, moved through four rejected visual directions before landing on a turn-by-turn cue readable in under two seconds.",
          "Alexa opened through a long press on Loop, without a wake word. Its tablet response templates had to be redesigned for the 110 by 110 pixel display.",
          "The Focals Sizing App used face scanning to solve fit and return risk at home. Accuracy, trust, and how wrong is too wrong were all design problems.",
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
