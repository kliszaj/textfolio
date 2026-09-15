import Image from "next/image";
import { LazyVideo } from "@/components/LazyVideo";
import type { ProjectAsset, ProjectExperiment } from "@/data/projectsExperiments";

type ProjectsCollectionProps = {
  projects: ProjectExperiment[];
  layout?: ProjectsCollectionLayout;
  showOutro?: boolean;
};

export type ProjectsCollectionLayout = "gallery" | "split" | "ledger";

function ProjectMedia({
  asset,
  index,
  panoramic = false,
}: {
  asset: ProjectAsset;
  index: number;
  panoramic?: boolean;
}) {
  return (
    <figure
      data-testid="project-asset"
      data-wide={panoramic || undefined}
      className={`relative overflow-hidden rounded-xl bg-ink/[0.08] md:rounded-2xl ${
        panoramic ? "aspect-[21/9]" : "aspect-[16/10]"
      }`}
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
            sizes={panoramic
              ? "(min-width: 1600px) 100rem, calc(100vw - 5rem)"
              : "(min-width: 768px) 50vw, 50vw"}
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

export function ProjectsCollection({
  projects,
  layout = "split",
  showOutro = true,
}: ProjectsCollectionProps) {
  const isLedger = layout === "ledger";
  const isSplit = layout === "split";
  return (
    <section
      aria-labelledby="projects-collection-heading"
      className="bg-cream px-6 pb-20 md:px-10 md:pb-28 2xl:px-14"
    >
      <div className="mx-auto w-full max-w-[100rem]">
        <h2 id="projects-collection-heading" className="sr-only">
          Project collection
        </h2>

        <div className="divide-y divide-ink/20">
          {projects.map((project, projectIndex) => {
            const assets = project.assets.slice(0, 3);
            const topAssets = assets.slice(0, 2);
            const wideAsset = assets[2];
            const textOnRight = isSplit && projectIndex % 2 === 1;
            const articleClass = isSplit
              ? `grid gap-8 py-12 md:py-16 lg:gap-12 ${
                  textOnRight
                    ? "lg:grid-cols-[minmax(0,1.8fr)_minmax(14rem,0.7fr)]"
                    : "lg:grid-cols-[minmax(14rem,0.7fr)_minmax(0,1.8fr)]"
                }`
              : isLedger
                ? "py-8 md:py-12"
                : "py-14 md:py-20";
            const introClass = isSplit
              ? `lg:sticky lg:top-32 lg:self-start ${textOnRight ? "lg:col-start-2" : ""}`
              : isLedger
                ? "mb-5 grid gap-2 md:mb-7 md:grid-cols-[minmax(12rem,0.7fr)_minmax(0,1.3fr)] md:gap-8"
                : "mb-8 grid gap-3 md:mb-10 md:grid-cols-2 md:gap-6";
            const titleClass = isLedger || isSplit
              ? "font-display text-3xl leading-none md:text-4xl"
              : "font-display text-4xl leading-none md:text-5xl";
            const descriptionClass = isLedger
              ? "case-study-copy max-w-2xl font-body font-medium"
              : isSplit
                ? "case-study-copy mt-3 max-w-md font-body font-medium"
                : "case-study-copy max-w-xl font-body font-medium";
            const primaryColumns = topAssets.length > 1
              ? isLedger ? "grid-cols-2" : "md:grid-cols-2"
              : "grid-cols-1";

            return (
              <article
                key={project.id}
                aria-labelledby={`${project.id}-title`}
                data-testid="project-entry"
                data-layout={layout}
                data-text-side={textOnRight ? "right" : "left"}
                className={articleClass}
              >
                <div className={introClass}>
                  <h3
                    id={`${project.id}-title`}
                    className={titleClass}
                  >
                    {project.title}
                  </h3>
                  <p className={descriptionClass}>
                    {project.description}
                  </p>
                </div>

                <div className={textOnRight ? "lg:col-start-1 lg:row-start-1" : ""}>
                  {topAssets.length > 0 && (
                    <div
                      data-testid="project-primary-assets"
                      data-count={topAssets.length}
                      className={`grid ${isLedger ? "gap-2.5 md:gap-5" : "gap-4 md:gap-6"} ${primaryColumns}`}
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
                    <div
                      data-testid="project-wide-asset"
                      className={isLedger ? "mt-2.5 md:mt-5" : "mt-4 md:mt-6"}
                    >
                      <ProjectMedia asset={wideAsset} index={2} panoramic={layout !== "gallery"} />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {showOutro && <footer className="border-t border-ink/20 py-8 md:py-10">
          <h3 className="font-display text-3xl leading-none md:text-4xl">
            more coming soon...
          </h3>
          <p className="case-study-copy mt-4 font-body font-medium">
            I&apos;m always tinkering
          </p>
        </footer>}
      </div>
    </section>
  );
}
