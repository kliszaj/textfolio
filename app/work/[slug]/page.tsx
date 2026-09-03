import { notFound } from "next/navigation";
import { caseStudies, getCaseStudyBySlug, getNextCaseStudy } from "@/data/caseStudies";
import { ABOUT_PAGE } from "@/data/about";
import { CaseStudyView } from "@/components/CaseStudyView";

// The case studies are a fixed list, so every route can be built ahead of
// time. That keeps the whole site static, which is what lets it deploy to a
// plain static host with no server runtime.
export function generateStaticParams() {
  return caseStudies.map((caseStudy) => ({ slug: caseStudy.slug }));
}

type CaseStudyPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CaseStudyPage({ params }: CaseStudyPageProps) {
  const { slug } = await params;
  const caseStudy = getCaseStudyBySlug(slug);
  if (!caseStudy) {
    notFound();
    return null;
  }

  // The loop runs through About too, even though it lives outside the
  // caseStudies array getNextCaseStudy wraps around: the last real case
  // study's next stop is About, and About's own page sends the loop back to
  // the first case study (see app/about/page.tsx).
  const isLastCaseStudy = slug === caseStudies[caseStudies.length - 1].slug;
  const next = isLastCaseStudy ? ABOUT_PAGE : getNextCaseStudy(slug);

  return <CaseStudyView caseStudy={caseStudy} next={next} />;
}
