// A fact value that should render as a real link (mailto:, https:, ...)
// rather than plain text -- contact details need to be tappable, not just
// readable.
export type CaseStudyFactLink = { label: string; href: string };

// One line of the at-a-glance rail: "Role", "Design Lead". A fact can
// optionally be a short bulleted list when its values need separate emphasis,
// or a list of links when the values are things a reader would want to open.
export type CaseStudyFact = { label: string; value: string | string[] | CaseStudyFactLink[] };

export type CaseStudyAction = {
  title: string;
  // A mailto: emails (the address copies itself); anything else downloads.
  href: string;
  // Under the title: the address itself, or what you get.
  detail: string;
  // A picture of what downloads (the CV's first page), in place of the
  // round button.
  preview?: string;
};

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
  span?: "full" | "tall" | "half" | "third";
  aspect?: "landscape" | "portrait" | "wide" | "upright";
  // The clip's name, shown on it while it's hovered (always, without hover).
  caption?: string;
  // The clip's background colour, sampled from the video. A clip that plays
  // on hover grows a band of it around its frame while it plays. Colour cards
  // are always the case study's secondary colour: the next page's
  // thumbnailColor, as on its next arrow. Without `transparent`, the colour is
  // built into the media.
  tint?: string;
  // A see-through clip: its background is the page's secondary colour, drawn
  // by the tile rather than built into the video.
  transparent?: { hevc: string; webm: string };
  // A tall image shown one band at a time in a landscape frame, moving on to
  // the next while hovered (without hover, while its row is in view).
  steps?: CaseStudyMediaSteps;
  // Work that hasn't launched: the media itself is blurred, and this says
  // why, over a lock, in the middle of the tile -- or of `area`, the blurred
  // part, as percentages of the tile's width in from each side.
  unreleased?: { title: string; detail: string; area?: { left: number; right: number } };
};

// The image's own size, and its bands in its pixels, top to bottom.
export type CaseStudyMediaSteps = {
  width: number;
  height: number;
  bands: { label: string; color: string; top: number; height: number }[];
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
  // Caption for videoSrc, shown the same way as the media's.
  videoCaption?: string;
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
  // "lead" sets the overview a size up, as a page's opening line (About).
  overviewStyle?: "lead";
  facts?: CaseStudyFact[];
  // Big calls to action in the rail's place (About), each a card that emails
  // (a mailto: href copies the address) or opens something.
  actions?: CaseStudyAction[];
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
    oneLiner: "Listen together with friends, from anywhere in the world.",
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
          "30% of all listening happens in the presence of others. Plenty of platforms have tried to build synchronous listening and viewing experiences, but none of them really took off. Interaction friction is an obvious challenge, but helping users overcome social friction is the real hurdle. People need to feel welcome to join, and it has to feel spontaneous rather than something that takes coordinating. Once they’re in, they need to feel comfortable contributing, and to get past the small anxieties of listening with others, like “Will my friend be offended if I change the song?”",
      },
      {
        body:
          "I was responsible for solving these challenges with Jam. I designed a safe, seamless proactive nudging system, which was key to scaling Jam and finding product-market fit. I worked with other designers to adapt it for car, desktop and TV. I also designed ways to encourage remote Jams, where people listen together from different places, through Listening Activity and Messages.",
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
        src: "/assets/jam-host-alpha.mp4",
        alt: "Hosting a Spotify Jam",
        kind: "video",
        span: "third",
        aspect: "portrait",
        transparent: { hevc: "/assets/jam-host-alpha.mp4", webm: "/assets/jam-host-alpha.webm" },
      },
      {
        src: "/assets/jam-main-flow-alpha.mp4",
        alt: "Spotify Jam main flow",
        kind: "video",
        span: "third",
        aspect: "portrait",
        transparent: { hevc: "/assets/jam-main-flow-alpha.mp4", webm: "/assets/jam-main-flow-alpha.webm" },
      },
      {
        src: "/assets/jam-two-choice-alpha.mp4",
        alt: "Choosing how to join a Spotify Jam",
        kind: "video",
        span: "third",
        aspect: "portrait",
        transparent: { hevc: "/assets/jam-two-choice-alpha.mp4", webm: "/assets/jam-two-choice-alpha.webm" },
      },
      {
        src: "/assets/jam-desktop-clear.mp4",
        alt: "Spotify Jam desktop experience",
        kind: "video",
        span: "full",
        aspect: "landscape",
        transparent: { hevc: "/assets/jam-desktop-clear.mp4", webm: "/assets/jam-desktop-clear.webm" },
      },
      {
        src: "/assets/jam-tv-clear.mp4",
        alt: "Spotify Jam TV experience",
        kind: "video",
        span: "full",
        aspect: "landscape",
        transparent: { hevc: "/assets/jam-tv-clear.mp4", webm: "/assets/jam-tv-clear.webm" },
      },
    ],
  },
  {
    slug: "seamless-strategy",
    title: "Seamless Strategy",
    thumbnailColor: "#F850C0",
    blurb: "Taking Spotify beyond Ubiquity",
    oneLiner: "Shaping how 500 million people listen, on every device they own.",
    overview:
      "Spotify has held a competitive advantage by being available on any device you may want to listen on. In 2023 I co-created Spotify’s Seamless strategy to build on that advantage. It was a shift from simply being available on every device to delivering coherent, seamless experiences that multiply value through onboarding and activation, proactive recommendations and contextual nudges, and social listening.",
    facts: [
      { label: "Role • 2023-Present", value: "Co-Creator, Design Lead" },
      { label: "Scope", value: "Design Strategy, Product Strategy, Research" },
      { label: "Impact", value: "Co-created business strategy impacting over 500 million users" },
    ],
    factsLayout: "columns",
    sections: [
      {
        body:
          "I facilitated cross-organizational opportunity mapping workshops, co-authored a bet list informed by data and insights, defined the strategy’s pillars, and helped shape the multi-year roadmap that became a new Product Area.",
      },
      {
        body:
          "Since then, as a Staff Designer in the product area, I’ve co-designed experiences that put the strategy into practice. These include ML-driven device recommendations that help people listen on the best device available in the moment. I rewrote the Spotify Connect value proposition to make it clearer: one place for all your devices, start here and control anywhere, and built for listening together. I redesigned the Connect device sheet to make it simpler and ready for what’s next. I also designed new reasons to use Connect, launching soon.",
      },
      {
        body:
          "The Seamless Strategy remains a core focus for the business and the Product Area has grown to over 60 people.",
      },
    ],
    mediaPadded: true,
    mediaLayout: "sequence",
    media: [
      {
        src: "/assets/seamless-film.mp4",
        alt: "Spotify on an iPhone: from Home to the Connect device sheet",
        kind: "video",
        span: "full",
        aspect: "landscape",
        tint: "#ffaf36",
      },
      {
        src: "/assets/seamless-connect-phone.jpg",
        alt: "The redesigned Connect device sheet, listening on this iPhone",
        span: "third",
        aspect: "portrait",
        tint: "#ffaf36",
      },
      {
        src: "/assets/seamless-connect-speaker.jpg",
        alt: "The redesigned Connect device sheet, playing on a Bose speaker",
        span: "third",
        aspect: "portrait",
        tint: "#ffaf36",
      },
      {
        // Not shipped yet: the whole frame is blurred in the video itself.
        src: "/assets/seamless-connect.mp4",
        alt: "Upcoming Connect features, obscured until launch",
        kind: "video",
        span: "third",
        aspect: "portrait",
        tint: "#ffaf36",
        unreleased: { title: "Under wraps", detail: "Launching soon" },
      },
      {
        // The strategy is still in motion, so it's blurred whole (the bets are
        // blurred in the file itself too) and moves through its pillars, one
        // at a time, under its lock.
        src: "/assets/seamless-roadmap.jpg",
        alt: "The Seamless roadmap: Enable Devices, Enable Moments and Enable People, each with its bets from now to later",
        span: "full",
        aspect: "landscape",
        tint: "#1c1c1c",
        unreleased: { title: "Under wraps", detail: "Launching soon" },
        steps: {
          width: 2400,
          height: 3110,
          bands: [
            { label: "Enable Devices", color: "#f1a942", top: 50, height: 1004 },
            { label: "Enable Moments", color: "#559ef6", top: 1064, height: 1120 },
            { label: "Enable People", color: "#f5d745", top: 2195, height: 867 },
          ],
        },
      },
    ],
  },
  {
    slug: "focals-by-north",
    title: "Focals by North",
    thumbnailColor: "#FFA52E",
    blurb: "Designing an operating system that you're barely meant to use.",
    oneLiner: "Glanceable computing, hidden in an ordinary pair of glasses.",
    overview:
      "Before Meta made headlines with smartglasses, I was a Senior UX Designer at a stealth startup in Canada called North. We had the mission of creating the next mode of computing: a pair of camera-free smartglasses with a holographic display that only the wearer could see.",
    overviewLink: {
      label: "Meta made headlines with smartglasses",
      href: "https://www.wired.com/story/zuckoff-app-sees-meta-glasses-before-they-see-you/",
    },
    facts: [
      { label: "Role • 2016-2020", value: "Senior UX Designer" },
      { label: "Scope", value: "0→1 interaction model, hardware-software co-design, information architecture" },
      { label: "Impact", value: "Helped pave the way for computing in glasses, acquired by Google to carry on the work" },
    ],
    factsLayout: "columns",
    videoSrc: "/assets/focals.mp4",
    sections: [
      {
        body:
          "I joined the startup early on and the jobs I did varied. This included foundational research, usability testing, service design for our New York and Toronto stores, defined the device’s input method, helped define the hero feature-set, and created an intuitive interface for users that was discreet and embodied the principles of humane tech. In addition, I created a new product design process that allowed us to ideate, build, and ship in one week to quickly search for product-market fit and designed the mobile sizing app to expand our reach, allowing users to scan their faces and find their size at home without needing to visit a store.",
        bodyLink: {
          label: "created a new product design process",
          href: "/archive/2019/pmf.html",
        },
      },
      {
        body:
          "In the end, Focals were not commercially successful but received strong positive reviews from Wired and TechCrunch. The company was acquired by Google in 2020, and it looks like the spirit of the glasses lives on.",
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
        aspect: "upright",
        // Framed in an iPhone on a colour card, like the other phones.
        tint: "#219ffb",
      },
      {
        src: "/assets/focals-loop-sizing.mp4",
        alt: "Loop home-sizing flow in the mobile app",
        kind: "video",
        span: "tall",
        aspect: "upright",
        // Framed in an iPhone on a colour card, like the other phones.
        tint: "#219ffb",
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
    title: "Projects",
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
