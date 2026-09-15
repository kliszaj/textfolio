export type ProjectAsset = {
  src?: string;
  alt: string;
  kind?: "image" | "video";
  width?: number;
  height?: number;
};

export type ProjectExperiment = {
  id: string;
  title: string;
  description: string;
  assets: ProjectAsset[];
};

// Each project can carry one, two, or three pieces of media. The first two
// share a row; the optional third becomes a wider closing image or video.
// Empty assets are intentional, visible placeholders while the collection is
// being assembled.
export const PROJECTS_EXPERIMENTS: ProjectExperiment[] = [
  {
    id: "word-snap",
    title: "wordsnap.",
    description:
      "A device for language learners that you use to quickly capture, words, phrases, idioms out in the wild. The wordsnaps are automatically translated and uploaded to Anki so you can practice them",
    assets: [
      {
        src: "/assets/wordsnap.jpg",
        alt: "wordsnap handheld device concept",
        width: 1462,
        height: 883,
      },
      {
        src: "/assets/wordsnap-recording.jpg",
        alt: "wordsnap device recording on a burgundy work surface",
        width: 1448,
        height: 1086,
      },
      { alt: "wordsnap wide asset coming soon" },
    ],
  },
  {
    id: "spellbook-and-tome",
    title: "Spellbook & Tome",
    description:
      "A webserver and a python app to manage your Magic: The Gathering decks and help you get tips to build a better deck. Helping me get better at a nerdy hobby I picked up last winter.",
    assets: [
      { alt: "Spellbook & Tome asset 1 coming soon" },
      { alt: "Spellbook & Tome asset 2 coming soon" },
      { alt: "Spellbook & Tome wide asset coming soon" },
    ],
  },
  {
    id: "e-ink-displays",
    title: "e-ink displays",
    description:
      "A webserver and a python app to manage your Magic: The Gathering decks and help you get tips to build a better deck. Helping me get better at a nerdy hobby I picked up last winter.",
    assets: [
      { alt: "e-ink displays asset 1 coming soon" },
      { alt: "e-ink displays asset 2 coming soon" },
      { alt: "e-ink displays wide asset coming soon" },
    ],
  },
  {
    id: "llaminders",
    title: "llaminders",
    description:
      "A sort of clone of the iOS Notes app that talks to a Vikunja instances that I have running on my home server.",
    assets: [
      { alt: "llaminders asset 1 coming soon" },
      { alt: "llaminders asset 2 coming soon" },
      { alt: "llaminders wide asset coming soon" },
    ],
  },
];
