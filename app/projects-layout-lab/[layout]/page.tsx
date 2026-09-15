import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ProjectsCollection,
  type ProjectsCollectionLayout,
} from "@/components/ProjectsCollection";
import { PROJECTS_EXPERIMENTS } from "@/data/projectsExperiments";

const LAYOUTS: Array<{
  id: ProjectsCollectionLayout;
  label: string;
  note: string;
}> = [
  { id: "gallery", label: "01 · Airy gallery", note: "Large type and generous pacing" },
  { id: "split", label: "02 · Split rail", note: "Alternating sticky notes and media rails" },
  { id: "ledger", label: "03 · Editorial ledger", note: "Compact, scannable, and closest to the mockup" },
];

export const dynamicParams = false;

export function generateStaticParams() {
  return LAYOUTS.map(({ id }) => ({ layout: id }));
}

type ProjectsLayoutLabPageProps = {
  params: Promise<{ layout: string }>;
};

export default async function ProjectsLayoutLabPage({ params }: ProjectsLayoutLabPageProps) {
  const { layout } = await params;
  const selected = LAYOUTS.find(({ id }) => id === layout);
  if (!selected) notFound();

  return (
    <main className="min-h-screen bg-cream text-ink">
      <header className="bg-[#219EFA] px-6 py-8 md:px-10 md:py-10 2xl:px-14">
        <div className="mx-auto w-full max-w-[100rem]">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="font-body text-sm font-medium uppercase tracking-[0.08em]">
                Temporary layout lab
              </p>
              <h1 className="mt-2 font-display text-4xl leading-none md:text-6xl">
                {selected.label}
              </h1>
              <p className="mt-3 font-body text-base font-medium md:text-lg">
                {selected.note}
              </p>
            </div>
            <Link
              href="/work/projects-and-experiments"
              className="font-body text-base font-medium underline underline-offset-4"
            >
              View selected live page
            </Link>
          </div>

          <nav aria-label="Layout options" className="mt-8 flex flex-wrap gap-2">
            {LAYOUTS.map((option) => (
              <Link
                key={option.id}
                href={`/projects-layout-lab/${option.id}`}
                aria-current={option.id === selected.id ? "page" : undefined}
                className={`rounded-full border border-ink px-4 py-2 font-body text-sm font-medium transition-colors ${
                  option.id === selected.id ? "bg-ink text-cream" : "hover:bg-ink/10"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <ProjectsCollection projects={PROJECTS_EXPERIMENTS} layout={selected.id} />
    </main>
  );
}
