import { render, screen, within } from "@testing-library/react";
import { ProjectsCollection } from "./ProjectsCollection";
import type { ProjectExperiment } from "@/data/projectsExperiments";

const projects: ProjectExperiment[] = [
  {
    id: "word-snap",
    title: "wordsnap",
    github: "https://github.com/example/repo",
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
    github: "https://github.com/example/repo",
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
  expect(screen.getAllByText("Coming soon")).toHaveLength(2);
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

test("ends on the last project, with no closing note", () => {
  render(<ProjectsCollection projects={projects} />);

  expect(screen.queryByText("more coming soon...")).not.toBeInTheDocument();
});

test("shows a web app's screenshot whole, in a browser window on its colour", () => {
  render(
    <ProjectsCollection
      projects={[
        {
          id: "app",
          title: "app",
          github: "https://github.com/example/repo",
          description: "An app.",
          assets: [
            {
              src: "/assets/app.webp",
              alt: "the app",
              width: 1655,
              height: 1049,
              browserFrame: { background: "#EF5350", url: "app.local", theme: "light" },
            },
          ],
        },
      ]}
    />
  );

  const frame = screen.getByTestId("browser-frame");
  expect(within(frame).getByRole("img", { name: "the app" })).toHaveClass("w-full", "h-auto");
  expect(within(frame).getByText("app.local")).toBeInTheDocument();
  expect(frame).toHaveClass("bg-white");
  expect(frame.parentElement).toHaveStyle({ backgroundColor: "#EF5350" });
});

test("links each project to its GitHub repo below the title", () => {
  render(<ProjectsCollection projects={projects} />);
  const [first] = projects;
  const link = screen.getByRole("link", { name: `${first.title} on GitHub` });
  expect(link).toHaveAttribute("href", first.github);
  expect(link).toHaveAttribute("target", "_blank");
});
