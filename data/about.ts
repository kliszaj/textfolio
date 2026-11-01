import type { CaseStudy } from "./caseStudies";

// How to reach Adrian, shown on About and in every page's footer.
export const CONTACT = {
  email: "hello@adrianklisz.com",
  linkedin: "https://www.linkedin.com/in/adrianklisz/",
  github: "https://github.com/kliszaj",
  // A PDF in public/. About only shows its card when this is set, so it
  // can be emptied (null) to take the CV down.
  cv: "/adrian-klisz-cv.pdf" as string | null,
};

// Shaped like a CaseStudy so it renders through the same CaseStudyView,
// CaseStudyPreview, and CaseStudyFocus components as a real case study --
// but it lives here, not in the caseStudies array, so it never appears in
// the page indicator, the "next project" cycle, or a /work/[slug] lookup.
export const ABOUT_PAGE: CaseStudy = {
  slug: "about",
  title: "About Me",
  thumbnailColor: "#FDD721",
  blurb: "",
  overview: "I’m Adrian, a designer from Canada and currently living in Stockholm, Sweden. I work at Spotify as a Staff Designer.",
  overviewStyle: "lead",
  sections: [
    {
      body: "Outside of work I love to spend time in the outdoors - whether it's gravel biking, camping, or foraging. I tend to collect new hobbies and I'm always tinkering with something I know completely nothing about. Lately I've been really into 3D printing and I've started playing the classic card game Magic: The Gathering.",
    },
    { body: "Whatever I do, I approach it with an innate curiosity and a high bar for craft." },
  ],
  // Where a case study's facts would be: the two things a visitor most
  // likely came for. The footer still lists every link.
  actions: [
    { title: "Email me", href: `mailto:${CONTACT.email}`, detail: CONTACT.email },
    ...(CONTACT.cv ? [{ title: "My CV", href: CONTACT.cv, detail: "One page, PDF" }] : []),
  ],
  mediaPadded: true,
};

export type AboutBentoData = {
  portrait: { src: string; alt: string };
  // Spotify's own player for it.
  playlist: { title: string; embedSrc: string };
  reading: {
    title: string;
    // Each book's note is a line about it, shown under the fan once it's picked.
    // The spine's colours are the cover's own, more or less.
    books: Array<{ title: string; author: string; href: string; coverSrc: string; note: string; spine: string; spineText: string }>;
  };
};

// The row of tiles under the bio. Update it whenever the playlist or the
// reading changes.
export const ABOUT_BENTO: AboutBentoData = {
  portrait: { src: "/assets/adrian.jpeg", alt: "Portrait of Adrian" },
  playlist: {
    title: "On Rotation",
    embedSrc: "https://open.spotify.com/embed/playlist/6Elc9EJreVRGJnM38lOE1E?utm_source=generator",
  },
  reading: {
    title: "Currently reading",
    books: [
      {
        title: "Loonshots",
        author: "Safi Bahcall",
        href: "https://www.bahcall.com/book/",
        coverSrc: "https://m.media-amazon.com/images/I/71aYLQxV4tL._SL1500_.jpg",
        note: "Why great teams and companies kill their craziest ideas, and how to nurture the ones that end up changing everything.",
        spine: "#efe7d6",
        spineText: "#1c1c1c",
      },
      {
        title: "Mina vänner",
        author: "Fredrik Backman",
        href: "https://www.norstedts.se/bok/9789113143835/mina-vanner-v618798",
        coverSrc:
          "https://www.studentapan.se/images/format:webp/size:640:0/quality:100/asset/book-cover/mina-vanner-9789113143804",
        note: "Fredrik Backman's novel about friendship, art and growing up, read slowly, in Swedish.",
        spine: "#2f5d8a",
        spineText: "#ffffff",
      },
      {
        title: "Mistborn",
        author: "Brandon Sanderson",
        href: "https://www.goodreads.com/book/show/68428.Mistborn",
        coverSrc: "/assets/book-mistborn.jpg",
        note: "Brandon Sanderson's fantasy about a crew of thieves planning to overthrow an immortal emperor.",
        spine: "#5b4a86",
        spineText: "#f4a582",
      },
      {
        title: "Rules to Live By",
        author: "Jimmy Chin",
        href: "https://www.goodreads.com/book/show/244963836-rules-to-live-by",
        coverSrc: "/assets/book-rules-to-live-by.jpg",
        note: "Jimmy Chin on the rules that people living extraordinary lives actually live by.",
        spine: "#2b3138",
        spineText: "#ffffff",
      },
    ],
  },
};
