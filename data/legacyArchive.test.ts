import { getCaseStudyBySlug } from "./caseStudies";

test("links Focals' design-process reference to the historic PMF page", () => {
  const focals = getCaseStudyBySlug("focals-by-north");
  const designProcessSection = focals?.sections?.find(
    (section) => section.bodyLink?.label === "created a new product design process"
  );

  expect(designProcessSection?.bodyLink?.href).toBe("/archive/2019/pmf.html");
});

test("links Focals' review references to Wired and the TechCrunch video", () => {
  const focals = getCaseStudyBySlug("focals-by-north");
  const reviewsSection = focals?.sections?.find((section) => section.bodyLinks);

  expect(reviewsSection?.bodyLinks).toEqual([
    {
      label: "Wired",
      href: "https://www.wired.com/review/focals-by-north-smart-glasses/",
    },
    {
      label: "TechCrunch",
      href: "https://www.youtube.com/watch?v=5eO-Y36_t08",
    },
  ]);
});
