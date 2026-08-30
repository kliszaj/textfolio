import { caseStudies, getCaseStudyBySlug, getNextCaseStudy } from "./caseStudies";

test("has at least 3 case studies", () => {
  expect(caseStudies.length).toBeGreaterThanOrEqual(3);
});

test("all slugs are unique", () => {
  const slugs = caseStudies.map((c) => c.slug);
  expect(new Set(slugs).size).toBe(slugs.length);
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
    expect(getNextCaseStudy("spotify-jam").slug).toBe("focals-by-north");
  });

  test("wraps past the last study back to the first", () => {
    const last = caseStudies[caseStudies.length - 1];
    expect(getNextCaseStudy(last.slug).slug).toBe(caseStudies[0].slug);
  });

  test("falls back to the first study for a slug that is not in the list", () => {
    expect(getNextCaseStudy("no-such-study").slug).toBe(caseStudies[0].slug);
  });
});
