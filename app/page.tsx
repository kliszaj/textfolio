import Link from "next/link";
import { caseStudies, caseStudyRoute } from "@/data/caseStudies";
import { ABOUT_PAGE } from "@/data/about";

// The desk is the landing page. Its monitor runs a random case study in a
// browser window; a tap zooms through into it. The desk itself is rendered by
// DeskHost in the root layout, so it survives the trip into a case study and
// back.
//
// The desk is drawn in the browser only, so this is the page's real content:
// prerendered for search engines, screen readers and anyone without WebGL.
// The desk covers it visually; a keyboard user tabbing into the links gets
// them as a panel, so focus never lands on something invisible.
export default function HomePage() {
  return (
    <main className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:top-4 focus-within:left-4 focus-within:z-50 focus-within:max-w-sm focus-within:rounded-xl focus-within:bg-cream focus-within:p-6 focus-within:text-ink focus-within:shadow-2xl">
      <h1 className="font-display text-3xl">Adrian Klisz</h1>
      <p className="mt-2 font-body">Staff Product Designer in Stockholm. Designer, tinkerer, zero-to-one builder.</p>
      <nav aria-label="Case studies" className="mt-4 font-body">
        <ul className="flex flex-col gap-2">
          {caseStudies.map((caseStudy) => (
            <li key={caseStudy.slug}>
              <Link href={caseStudyRoute(caseStudy)} className="underline underline-offset-4">
                {caseStudy.title}
              </Link>
              {caseStudy.blurb && <span>: {caseStudy.blurb}</span>}
            </li>
          ))}
          <li>
            <Link href={caseStudyRoute(ABOUT_PAGE)} className="underline underline-offset-4">
              {ABOUT_PAGE.title}
            </Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}
