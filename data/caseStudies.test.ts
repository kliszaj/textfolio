import { caseStudies, caseStudyRoute, getCaseStudyBySlug, getNextCaseStudy } from "./caseStudies";
import { ABOUT_PAGE } from "./about";

test("has at least 3 case studies", () => {
  expect(caseStudies.length).toBeGreaterThanOrEqual(3);
});

test("ends with an ongoing personal Tinkering page", () => {
  const projects = caseStudies[caseStudies.length - 1];
  expect(projects).toMatchObject({
    slug: "projects-and-experiments",
    title: "Tinkering",
    blurb: expect.stringMatching(/evenings and weekends/i),
  });
});

test("all slugs are unique", () => {
  const slugs = caseStudies.map((c) => c.slug);
  expect(new Set(slugs).size).toBe(slugs.length);
});

test("keeps each case study date beside the role label, not in the large role value", () => {
  expect(caseStudies.slice(0, 3).map((caseStudy) => caseStudy.facts?.[0])).toEqual([
    { label: "Role • 2023-Present", value: "Design Lead" },
    { label: "Role • 2021-2022", value: "Co-Creator, Design Lead" },
    { label: "Role • 2018-2019", value: "Interaction Design Lead" },
  ]);
});

test("orders the Spotify Jam media as one full-width flow, two portrait choices, then desktop and TV", () => {
  const spotifyJam = getCaseStudyBySlug("spotify-jam");

  expect(spotifyJam?.mediaLayout).toBe("sequence");
  expect(spotifyJam?.media).toEqual([
    expect.objectContaining({ src: "/assets/jam-main-flow.mp4", span: "full", aspect: "landscape" }),
    expect.objectContaining({ src: "/assets/jam-host.mp4", span: "half", aspect: "portrait" }),
    expect.objectContaining({ src: "/assets/jam-two-choice.mp4", span: "half", aspect: "portrait" }),
    expect.objectContaining({ src: "/assets/jam-desktop.mp4", kind: "video", span: "full", aspect: "landscape" }),
    expect.objectContaining({ src: "/assets/jam-tv.mp4", kind: "video", span: "full", aspect: "landscape" }),
  ]);
});

test("links Matter from the Seamless Strategy overview", () => {
  expect(getCaseStudyBySlug("seamless-strategy")?.overviewLink).toEqual({
    label: "Matter",
    href: "https://en.wikipedia.org/wiki/Matter_(standard)",
  });
});

test("work overview body copy avoids em dashes", () => {
  for (const caseStudy of caseStudies) {
    for (const section of caseStudy.sections ?? []) {
      expect(section.body).not.toContain("—");
      for (const bullet of section.bullets ?? []) {
        expect(bullet).not.toContain("—");
      }
    }
  }
});

test("getCaseStudyBySlug finds an existing entry", () => {
  const first = caseStudies[0];
  expect(getCaseStudyBySlug(first.slug)).toEqual(first);
});

test("getCaseStudyBySlug returns undefined for an unknown slug", () => {
  expect(getCaseStudyBySlug("does-not-exist")).toBeUndefined();
});

describe("getNextCaseStudy", () => {
  test("returns the following study so the header arrow walks the list", () => {
    // Derived, not hardcoded: the running order changes as studies are written.
    expect(getNextCaseStudy(caseStudies[0].slug).slug).toBe(caseStudies[1].slug);
    expect(getNextCaseStudy(caseStudies[1].slug).slug).toBe(caseStudies[2].slug);
  });

  test("wraps past the last study back to the first", () => {
    const last = caseStudies[caseStudies.length - 1];
    expect(getNextCaseStudy(last.slug).slug).toBe(caseStudies[0].slug);
  });

  test("falls back to the first study for a slug that is not in the list", () => {
    expect(getNextCaseStudy("no-such-study").slug).toBe(caseStudies[0].slug);
  });
});

describe("caseStudyRoute", () => {
  test("routes a real case study to /work/[slug]", () => {
    expect(caseStudyRoute(caseStudies[0])).toBe(`/work/${caseStudies[0].slug}`);
  });

  test("routes About to /about, not /work/about", () => {
    expect(caseStudyRoute(ABOUT_PAGE)).toBe("/about");
  });
});
