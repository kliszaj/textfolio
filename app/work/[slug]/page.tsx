import { notFound } from "next/navigation";
import { caseStudies, getCaseStudyBySlug } from "@/data/caseStudies";
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

  return <CaseStudyView caseStudy={caseStudy} />;
}
