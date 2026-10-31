import type { CaseStudy } from "./caseStudies";
import type { AboutShelfData } from "@/components/AboutShelf";

// Shaped like a CaseStudy so it renders through the same CaseStudyView,
// CaseStudyPreview, and CaseStudyFocus components as a real case study --
// but it lives here, not in the caseStudies array, so it never appears in
// the page indicator, the "next project" cycle, or a /work/[slug] lookup.
// How to reach Adrian, shown on About and in every page's footer.
export const CONTACT = {
  email: "hello@adrianklisz.com",
  linkedin: "https://www.linkedin.com/in/adrianklisz/",
  github: "https://github.com/kliszaj",
  // A PDF in public/. About only shows its button when this is set, so it
  // can be emptied (null) to take the CV down.
  cv: "/adrian-klisz-cv.pdf" as string | null,
};

export const ABOUT_PAGE: CaseStudy = {
  slug: "about",
  title: "About Me",
  thumbnailColor: "#FDD721",
  blurb: "",
  overview: `I'm Adrian, a Staff Designer currently working at Spotify. I'm based in Stockholm but I'm originally from Canada.

I started out as a UX researcher, straight out of my master's — which is probably why I still can't design anything without wanting to test it first. From there I moved into hardware interaction design, where I properly cut my teeth: nothing forces you to think about real constraints like designing something people have to physically hold and push buttons on. For the last six years I've been at Spotify, where I've helped shape how the design team itself works — most recently, what design looks like in the age of agentic coding.

Outside of work I forage in the woods near where I live, ferment the results into hot sauce under my own label, shoot everything on film, and occasionally get far too deep into a game of Magic: The Gathering.

I care about setting a high bar for craft, and about staying close enough to the work to help others raise theirs too.`,
  // The portrait sits beside the bio, with the email, LinkedIn and CV
  // buttons (from CONTACT) under it. It lives here, not in the Now bento, so
  // it shows once.
  profile: {
    portrait: { src: "/assets/adrian.jpeg", alt: "Portrait of Adrian" },
  },
};

// What's on the shelf at the foot of About. Update it whenever the reading,
// the playlist or the game changes. The game is optional: the deck box only
// stands on the shelf while something is being played.
export const ABOUT_SHELF: AboutShelfData = {
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
  playlist: {
    title: "sept '26",
    href: "https://open.spotify.com/playlist/6Elc9EJreVRGJnM38lOE1E?si=e15070e9a39a4583",
    // Spotify's own cover for it (from its oEmbed thumbnail), kept here.
    coverSrc: "/assets/playlist-sept-26.jpg",
    embedSrc: "https://open.spotify.com/embed/playlist/6Elc9EJreVRGJnM38lOE1E?utm_source=generator",
    note: "What I've had on this month.",
  },
  game: {
    title: "Magic: The Gathering",
    note: "The Commander deck I'm brewing right now is Slimefoot and Squee.",
    // The commander's card (Scryfall's image) fronts the deck on the shelf.
    commander: "Slimefoot and Squee",
    cardSrc: "/assets/mtg-slimefoot-and-squee.jpg",
    deckHref: "https://moxfield.com/decks/9QQ-zl_89ECf2Lj7bUCDDw",
  },
};
