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
    title: "wordsnap",
    description: "A pocket instrument for catching language in motion.",
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
    id: "project-02",
    title: "Project 02",
    description: "Project title and description coming soon.",
    assets: [
      { alt: "Project 02 asset 1 coming soon" },
      { alt: "Project 02 asset 2 coming soon" },
      { alt: "Project 02 wide asset coming soon" },
    ],
  },
  {
    id: "project-03",
    title: "Project 03",
    description: "Project title and description coming soon.",
    assets: [
      { alt: "Project 03 asset 1 coming soon" },
      { alt: "Project 03 asset 2 coming soon" },
      { alt: "Project 03 wide asset coming soon" },
    ],
  },
];
