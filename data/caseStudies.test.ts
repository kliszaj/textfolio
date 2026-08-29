import { caseStudies, getCaseStudyBySlug } from "./caseStudies";

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
