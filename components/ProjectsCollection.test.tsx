import { render, screen, within } from "@testing-library/react";
import { ProjectsCollection } from "./ProjectsCollection";
import type { ProjectExperiment } from "@/data/projectsExperiments";

const projects: ProjectExperiment[] = [
  {
    id: "word-snap",
    title: "wordsnap",
    description: "A short description.",
    assets: [
      { src: "/assets/wordsnap.jpg", alt: "wordsnap concept", width: 1462, height: 883 },
      {
        src: "/assets/wordsnap-recording.jpg",
        alt: "wordsnap recording",
        width: 1448,
        height: 1086,
      },
      { alt: "Wide asset coming soon" },
    ],
  },
  {
    id: "single-asset",
    title: "Single asset",
    description: "One image should stay full width.",
    assets: [{ alt: "Only asset coming soon" }],
  },
];

test("renders project copy, supplied media, and visible placeholders", () => {
  render(<ProjectsCollection projects={projects} />);

  expect(screen.getByRole("heading", { name: "wordsnap" })).toBeInTheDocument();
  const conceptImage = screen.getByRole("img", { name: "wordsnap concept" });
  expect(conceptImage).toHaveAttribute("src", "/assets/wordsnap.jpg");
  expect(conceptImage).toHaveClass("object-cover");
  expect(screen.getByRole("img", { name: "wordsnap recording" })).toHaveAttribute(
    "src",
    "/assets/wordsnap-recording.jpg"
  );
  expect(screen.getByText("Asset 3 coming soon")).toBeInTheDocument();
});

test("uses two primary columns plus an optional full-width third asset", () => {
  render(<ProjectsCollection projects={projects} />);

  const primaryRows = screen.getAllByTestId("project-primary-assets");
  expect(primaryRows[0]).toHaveAttribute("data-count", "2");
  expect(primaryRows[0]).toHaveClass("md:grid-cols-2");
  expect(primaryRows[1]).toHaveAttribute("data-count", "1");
  expect(primaryRows[1]).toHaveClass("grid-cols-1");
  expect(screen.getAllByTestId("project-wide-asset")).toHaveLength(1);
  expect(within(screen.getAllByTestId("project-wide-asset")[0]).getByTestId("project-asset"))
    .toHaveClass("aspect-[21/9]");
});

test("alternates the split-rail text and media sides by project", () => {
  render(<ProjectsCollection projects={projects} layout="split" />);

  const entries = screen.getAllByTestId("project-entry");
  expect(entries[0]).toHaveAttribute("data-text-side", "left");
  expect(entries[1]).toHaveAttribute("data-text-side", "right");
  expect(entries[1]).toHaveClass(
    "lg:grid-cols-[minmax(0,1.8fr)_minmax(14rem,0.7fr)]"
  );
});

test("closes the collection with an open-ended experiments note", () => {
  render(<ProjectsCollection projects={projects} />);

  expect(screen.getByRole("heading", { name: "more coming soon..." })).toBeInTheDocument();
  expect(screen.getByText("I'm always tinkering")).toBeInTheDocument();
});
