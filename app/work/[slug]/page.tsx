import { notFound } from "next/navigation";
import { getCaseStudyBySlug } from "@/data/caseStudies";

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

  return (
    <main
      className="min-h-screen p-12"
      style={{ backgroundColor: caseStudy.thumbnailColor }}
    >
      <h1 className="font-display text-5xl">{caseStudy.title}</h1>
      <p className="font-script text-xl mt-4">{caseStudy.blurb}</p>
    </main>
  );
}
