import { CaseStudyView } from "@/components/CaseStudyView";
import { AboutNow } from "@/components/AboutNow";
import { caseStudies } from "@/data/caseStudies";
import { ABOUT_NOW, ABOUT_PAGE } from "@/data/about";

// Closes the loop: the last case study's next stop is About (see
// app/work/[slug]/page.tsx), and About's own next sends it back to the first.
export default function AboutPage() {
  return (
    <>
      <CaseStudyView caseStudy={ABOUT_PAGE} next={caseStudies[0]} />
      <AboutNow now={ABOUT_NOW} />
    </>
  );
}
