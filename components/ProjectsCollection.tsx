import Image from "next/image";
import { LazyVideo } from "@/components/LazyVideo";
import type { ProjectAsset, ProjectExperiment } from "@/data/projectsExperiments";

type ProjectsCollectionProps = {
  projects: ProjectExperiment[];
};

function ProjectMedia({ asset, index }: { asset: ProjectAsset; index: number }) {
  return (
    <figure
      data-testid="project-asset"
      className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-ink/[0.08]"
    >
      {asset.src ? (
        asset.kind === "video" ? (
          <LazyVideo
            src={asset.src}
            aria-label={asset.alt}
            className="size-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <Image
            src={asset.src}
            alt={asset.alt}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        )
      ) : (
        <figcaption className="absolute inset-0 grid place-items-center p-6 text-center font-body text-sm font-medium uppercase tracking-[0.08em] text-ink/45">
          Asset {index + 1} coming soon
        </figcaption>
      )}
    </figure>
  );
}

export function ProjectsCollection({ projects }: ProjectsCollectionProps) {
  return (
    <section
      aria-labelledby="projects-collection-heading"
      className="bg-cream px-6 pb-24 md:px-10 md:pb-32 2xl:px-14"
    >
      <div className="mx-auto w-full max-w-[100rem]">
        <h2 id="projects-collection-heading" className="sr-only">
          Project collection
        </h2>

        <div className="divide-y divide-ink/20 border-t border-ink/20">
          {projects.map((project) => {
            const assets = project.assets.slice(0, 3);
            const topAssets = assets.slice(0, 2);
            const wideAsset = assets[2];

            return (
              <article
                key={project.id}
                aria-labelledby={`${project.id}-title`}
                data-testid="project-entry"
                className="py-14 md:py-20"
              >
                <div className="mb-8 grid gap-3 md:mb-10 md:grid-cols-2 md:gap-6">
                  <h3
                    id={`${project.id}-title`}
                    className="font-display text-4xl leading-none md:text-5xl"
                  >
                    {project.title}
                  </h3>
                  <p className="max-w-xl font-body text-lg font-medium leading-snug md:text-xl">
                    {project.description}
                  </p>
                </div>

                {topAssets.length > 0 && (
                  <div
                    data-testid="project-primary-assets"
                    data-count={topAssets.length}
                    className={`grid gap-4 md:gap-6 ${
                      topAssets.length > 1 ? "md:grid-cols-2" : "grid-cols-1"
                    }`}
                  >
                    {topAssets.map((asset, assetIndex) => (
                      <ProjectMedia
                        key={asset.src ?? asset.alt}
                        asset={asset}
                        index={assetIndex}
                      />
                    ))}
                  </div>
                )}

                {wideAsset && (
                  <div data-testid="project-wide-asset" className="mt-4 md:mt-6">
                    <ProjectMedia asset={wideAsset} index={2} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
