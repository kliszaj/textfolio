export type ProjectAsset = {
  src?: string;
  alt: string;
  kind?: "image" | "video";
  width?: number;
  height?: number;
  // A screenshot of a web app: shown whole, in a browser window at `url`
  // and matching the app's `theme`, on `background`: the page's secondary
  // colour, About's yellow (data/about.ts).
  browserFrame?: { background: string; url: string; theme: "light" | "dark" };
};

export type ProjectExperiment = {
  id: string;
  title: string;
  github: string;
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
    title: "wordsnap",
    github: "https://github.com/kliszaj/wordsnap",
    description:
      "A handheld device for capturing Swedish words, phrases and idioms out in the wild. Each short recording is transcribed and turned into a flashcard, with a web app for correcting it before it's saved to Anki.",
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
      {
        src: "/assets/wordsnap-app.webp",
        alt: "The wordsnap web app: a list of captured Swedish words, with one word's audio, transcript and Anki card open for editing",
        width: 1655,
        height: 1049,
        browserFrame: { background: "#FDD721", url: "wordsnap.local", theme: "dark" },
      },
    ],
  },
  {
    id: "spellbook-and-tome",
    title: "spellbook",
    github: "https://github.com/kliszaj/spellbook",
    description:
      "A card search and deck workshop for Magic: The Gathering Commander. Describe a card in plain English to find it, save your picks into decks, and see what each deck is missing. Helping me get better at a nerdy hobby I picked up last winter.",
    assets: [
      {
        src: "/assets/spellbook-app.webp",
        alt: "The spellbook web app: a list of Magic: The Gathering decks, one deck's cards in a grid with its build progress above, and a card's details beside it",
        width: 1874,
        height: 1123,
        browserFrame: { background: "#FDD721", url: "spellbook.local/decks", theme: "light" },
      },
    ],
  },
  {
    id: "e-ink-displays",
    title: "e-ink display",
    github: "https://github.com/kliszaj/eink-weather-frame",
    description:
      "A battery-powered e-ink frame that shows how warm it feels outside and what the weather is doing, paired with a line from classic literature that matches it. There are over 1,400 quotes, each checked word for word against its source.",
    assets: [
      {
        src: "/assets/eink-display.webp",
        alt: "A white picture frame holding an e-ink display: 6°C and cloudy, with a line about a gray sky from Joseph Conrad's Typhoon",
        width: 1587,
        height: 991,
      },
    ],
  },
];
