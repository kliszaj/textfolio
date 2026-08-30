import { notFound } from "next/navigation";
import { getCaseStudyBySlug } from "@/data/caseStudies";
import { CaseStudyView } from "@/components/CaseStudyView";

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
