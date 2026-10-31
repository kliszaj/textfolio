import { CaseStudyView } from "@/components/CaseStudyView";
import { AboutShelf } from "@/components/AboutShelf";
import { caseStudies } from "@/data/caseStudies";
import { ABOUT_PAGE, ABOUT_SHELF } from "@/data/about";

// Closes the loop: the last case study's next stop is About (see
// app/work/[slug]/page.tsx), and About's own next sends it back to the first.
export default function AboutPage() {
  return (
    <CaseStudyView caseStudy={ABOUT_PAGE} next={caseStudies[0]}>
      <AboutShelf shelf={ABOUT_SHELF} />
    </CaseStudyView>
  );
}
