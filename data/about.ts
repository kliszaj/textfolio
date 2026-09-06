import type { CaseStudy } from "./caseStudies";
import type { AboutNowData } from "@/components/AboutNow";

// Shaped like a CaseStudy so it renders through the same CaseStudyView,
// CaseStudyPreview, and CaseStudyFocus components as a real case study --
// but it lives here, not in the caseStudies array, so it never appears in
// the page indicator, the "next project" cycle, or a /work/[slug] lookup.
export const ABOUT_PAGE: CaseStudy = {
  slug: "about",
  title: "About Me",
  thumbnailColor: "#FDD721",
  blurb: "",
  overview: `I'm Adrian, a Staff Product Designer currently working at Spotify. I'm based in Stockholm but I'm originally from Canada.

I started out as a UX researcher, straight out of my master's — which is probably why I still can't design anything without wanting to test it first. From there I moved into hardware interaction design, where I properly cut my teeth: nothing forces you to think about real constraints like designing something people have to physically hold and push buttons on. For the last six years I've been at Spotify, where I've helped shape how the design team itself works — most recently, what design looks like in the age of agentic coding.

Outside of work I forage in the woods near where I live, ferment the results into hot sauce under my own label, shoot everything on film, and occasionally get far too deep into a game of Magic: The Gathering.

I care about setting a high bar for craft, and about staying close enough to the work to help others raise theirs too.`,
  facts: [
    { label: "Based in", value: "Stockholm, Sweden" },
    { label: "From", value: "Toronto, Canada" },
    {
      label: "Say hi",
      value: [
        { label: "hello@adrianklisz.com", href: "mailto:hello@adrianklisz.com" },
        { label: "LinkedIn", href: "https://www.linkedin.com/in/adrianklisz/" },
      ],
    },
  ],
  introImage: {
    src: "/assets/adrian.jpeg",
    alt: "Portrait of Adrian",
    width: 1200,
    height: 1600,
  },
};

// Update this small record whenever the current shelf changes. The game is
// intentionally optional: it only appears when there is something Adrian is
// actively playing, rather than shipping a stale placeholder.
export const ABOUT_NOW: AboutNowData = {
  books: [
    {
      title: "Loonshots",
      author: "Safi Bahcall",
      href: "https://www.bahcall.com/book/",
      coverSrc: "https://m.media-amazon.com/images/I/71aYLQxV4tL._SL1500_.jpg",
    },
    {
      title: "Mina vänner",
      author: "Fredrik Backman",
      href: "https://www.norstedts.se/bok/9789113143835/mina-vanner-v618798",
      coverSrc:
        "https://www.studentapan.se/images/format:webp/size:640:0/quality:100/asset/book-cover/mina-vanner-9789113143804",
    },
  ],
  playlist: {
    title: "sept '26",
    href: "https://open.spotify.com/playlist/6Elc9EJreVRGJnM38lOE1E?si=e15070e9a39a4583",
    embedSrc: "https://open.spotify.com/embed/playlist/6Elc9EJreVRGJnM38lOE1E?utm_source=generator",
  },
};
