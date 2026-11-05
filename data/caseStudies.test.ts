import { caseStudies, caseStudyRoute, getCaseStudyBySlug, getNextCaseStudy } from "./caseStudies";
import { ABOUT_PAGE } from "./about";

test("has at least 3 case studies", () => {
  expect(caseStudies.length).toBeGreaterThanOrEqual(3);
});

test("ends with an ongoing personal Projects page", () => {
  const projects = caseStudies[caseStudies.length - 1];
  expect(projects).toMatchObject({
    slug: "projects-and-experiments",
    title: "Projects",
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
    { label: "Role • 2023-Present", value: "Co-Creator, Design Lead" },
    { label: "Role • 2016-2020", value: "Senior UX Designer" },
  ]);
});

test("orders the Spotify Jam media as one full-width flow, two portrait choices, then desktop and TV", () => {
  const spotifyJam = getCaseStudyBySlug("spotify-jam");

  expect(spotifyJam?.mediaLayout).toBe("sequence");
  expect(spotifyJam?.media).toEqual([
    expect.objectContaining({ src: "/assets/jam-host-alpha.mp4", span: "third", aspect: "portrait" }),
    expect.objectContaining({ src: "/assets/jam-main-flow-alpha.mp4", span: "third", aspect: "portrait" }),
    expect.objectContaining({ src: "/assets/jam-two-choice-alpha.mp4", span: "third", aspect: "portrait" }),
    expect.objectContaining({ src: "/assets/jam-desktop-clear.mp4", kind: "video", span: "full", aspect: "landscape" }),
    expect.objectContaining({ src: "/assets/jam-tv-clear.mp4", kind: "video", span: "full", aspect: "landscape" }),
  ]);
});

test("the Seamless Strategy overview leads with Ubiquity, with no link", () => {
  const seamless = getCaseStudyBySlug("seamless-strategy");
  expect(seamless?.overview).toMatch(/^Spotify has held a competitive advantage by being available on any device/);
  expect(seamless?.overviewLink).toBeUndefined();
});

test("the Seamless Strategy holds a full-width film, shows the device sheet and Connect as one row of phones, then steps through its roadmap", () => {
  const seamless = getCaseStudyBySlug("seamless-strategy");
  expect(seamless?.mediaLayout).toBe("sequence");
  expect(seamless?.media).toEqual([
    expect.objectContaining({ src: "/assets/seamless-film.mp4", kind: "video", span: "full", aspect: "landscape" }),
    expect.objectContaining({ src: "/assets/seamless-connect-phone.jpg", span: "third", aspect: "portrait" }),
    expect.objectContaining({ src: "/assets/seamless-connect-speaker.jpg", span: "third", aspect: "portrait" }),
    expect.objectContaining({ src: "/assets/seamless-connect.mp4", kind: "video", span: "third", aspect: "portrait", unreleased: expect.any(Object) }),
    expect.objectContaining({
      src: "/assets/seamless-roadmap.jpg",
      span: "full",
      aspect: "landscape",
      steps: expect.objectContaining({
        bands: [
          expect.objectContaining({ label: "Enable Devices" }),
          expect.objectContaining({ label: "Enable Moments" }),
          expect.objectContaining({ label: "Enable People" }),
        ],
      }),
    }),
  ]);
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

test("every case study opens on a one-liner", () => {
  for (const slug of ["spotify-jam", "seamless-strategy", "focals-by-north"]) {
    expect(getCaseStudyBySlug(slug)?.oneLiner).toBeTruthy();
  }
});
