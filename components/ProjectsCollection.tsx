import Image from "next/image";
import { LazyVideo } from "@/components/LazyVideo";
import { PhotoZoom } from "@/components/PhotoZoom";
import type { ProjectAsset, ProjectExperiment } from "@/data/projectsExperiments";

type ProjectsCollectionProps = {
  projects: ProjectExperiment[];
  layout?: ProjectsCollectionLayout;
};

export type ProjectsCollectionLayout = "gallery" | "split" | "ledger";

// A browser control, drawn at the toolbar's scale.
function ToolbarIcon({ path, className = "size-[1.5cqw]" }: { path: string; className?: string }) {
  const sized = className.includes("size-") ? className : `size-[1.5cqw] ${className}`;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${sized}`}>
      <path d={path} />
    </svg>
  );
}

// A browser window, in the app's own light or dark, around a screenshot. Its
// size comes from the tile's width, so the chrome scales with the picture.
function BrowserFrame({ asset }: { asset: ProjectAsset }) {
  const dark = asset.browserFrame?.theme === "dark";
  return (
    <figure
      data-testid="project-asset"
      data-framed
      className="@container grid aspect-[16/10] place-items-center overflow-hidden rounded-xl md:rounded-2xl"
      style={{ backgroundColor: asset.browserFrame?.background }}
    >
      <div
        data-testid="browser-frame"
        className={`w-[78%] overflow-hidden rounded-[1.1cqw] shadow-[0_2.5cqw_6cqw_-1.5cqw_rgb(28_28_28/0.55)] ring-1 ${
          dark ? "bg-[#111315] ring-white/10" : "bg-white ring-ink/10"
        }`}
      >
        <div
          aria-hidden="true"
          className={`flex h-[4.2cqw] items-center gap-[1cqw] px-[1.3cqw] ${
            dark ? "bg-[#26292d] text-white/55" : "bg-[#eceef0] text-ink/55"
          }`}
        >
          <span className="mr-[0.5cqw] flex gap-[0.6cqw]">
            <span className="size-[0.95cqw] rounded-full bg-[#ff5f57]" />
            <span className="size-[0.95cqw] rounded-full bg-[#febc2e]" />
            <span className="size-[0.95cqw] rounded-full bg-[#28c840]" />
          </span>
          <ToolbarIcon path="M15 5l-7 7 7 7" />
          <ToolbarIcon path="M9 5l7 7-7 7" className="opacity-40" />
          <ToolbarIcon path="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 3.5v4h-4" />
          <span
            className={`flex h-[2.7cqw] min-w-0 flex-1 items-center gap-[0.6cqw] rounded-full px-[1.1cqw] font-body text-[1.2cqw] leading-none ${
              dark ? "bg-[#17191c] text-white/80" : "bg-white text-ink/80"
            }`}
          >
            <ToolbarIcon path="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" className="size-[1.1cqw] opacity-70" />
            <span className="truncate">{asset.browserFrame?.url}</span>
          </span>
          <ToolbarIcon path="M12 5h.01M12 12h.01M12 19h.01" />
        </div>
        <PhotoZoom src={asset.src!} alt={asset.alt} className="block w-full">
          <Image
            src={asset.src!}
            alt={asset.alt}
            width={asset.width}
            height={asset.height}
            sizes="(min-width: 1600px) 60rem, 80vw"
            className="block h-auto w-full"
          />
        </PhotoZoom>
      </div>
    </figure>
  );
}

function ProjectMedia({
  asset,
  panoramic = false,
}: {
  asset: ProjectAsset;
  panoramic?: boolean;
}) {
  if (asset.browserFrame) return <BrowserFrame asset={asset} />;
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
          <PhotoZoom src={asset.src} alt={asset.alt} className="absolute inset-0">
            <Image
              src={asset.src}
              alt={asset.alt}
              fill
              sizes={panoramic
                ? "(min-width: 1600px) 100rem, calc(100vw - 5rem)"
                : "(min-width: 768px) 50vw, 50vw"}
              className="object-cover"
            />
          </PhotoZoom>
        )
      ) : (
        <figcaption className="absolute inset-0 grid place-items-center p-6 text-center font-body text-sm font-medium uppercase tracking-[0.08em] text-ink/45">
          Coming soon
        </figcaption>
      )}
    </figure>
  );
}

export function ProjectsCollection({
  projects,
  layout = "split",
}: ProjectsCollectionProps) {
  const isLedger = layout === "ledger";
  const isSplit = layout === "split";
  return (
    <section
      aria-labelledby="projects-collection-heading"
      // The case studies' own side margin (globals.css), so the collection's
      // edges line up with the text above it and every other page's.
      className="bg-cream pb-20 md:pb-28"
      style={{ paddingInline: "var(--case-study-gutter)" }}
    >
      <div className="mx-auto w-full max-w-[100rem]">
        <h2 id="projects-collection-heading" className="sr-only">
          Project collection
        </h2>

        <div>
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
            // Neue Montreal, not Frama: Frama is kept for page titles.
            const titleClass = isLedger || isSplit
              ? "font-body font-bold text-3xl leading-[1.05] tracking-[-0.015em] md:text-4xl"
              : "font-body font-bold text-4xl leading-[1.05] tracking-[-0.015em] md:text-5xl";
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
                      {topAssets.map((asset) => (
                        <ProjectMedia
                          key={asset.src ?? asset.alt}
                          asset={asset}
                        />
                      ))}
                    </div>
                  )}

                  {wideAsset && (
                    <div
                      data-testid="project-wide-asset"
                      className={isLedger ? "mt-2.5 md:mt-5" : "mt-4 md:mt-6"}
                    >
                      <ProjectMedia asset={wideAsset} panoramic={layout !== "gallery"} />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

      </div>
    </section>
  );
}
