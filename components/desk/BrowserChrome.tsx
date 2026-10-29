import type { CaseStudy } from "@/data/caseStudies";
import { caseStudyRoute } from "@/data/caseStudies";

function ChromeIcon({ path, muted = false }: { path: string; muted?: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={`size-4 shrink-0 ${muted ? "opacity-35" : "opacity-70"}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>;
}

// Decorative browser chrome. The monitor remains a single zoom target rather
// than presenting navigation buttons that compete with its click behavior.
export function BrowserChrome({ caseStudy }: { caseStudy: CaseStudy }) {
  return <div aria-hidden="true" className="h-[72px] border-b border-[#c9c7c4] bg-[#e7e5e2] font-body text-[#393937]">
    <div className="flex h-8 items-center gap-4 px-3">
      <span className="flex shrink-0 gap-2">
        {["#ff6058", "#febc2e", "#28c840"].map((color) => <span key={color} className="size-[10px] rounded-full border border-black/10" style={{ backgroundColor: color }} />)}
      </span>
      <span className="mt-1 flex h-7 w-52 min-w-0 items-center gap-2 rounded-t-lg bg-[#f6f5f3] px-3 text-xs">
        <span className="grid size-4 shrink-0 place-items-center rounded-sm bg-ink font-display text-[10px] text-cream">a</span>
        <span className="truncate">{caseStudy.title} · Adrian Klisz</span>
        <span className="ml-auto text-base opacity-50">×</span>
      </span>
      <span className="text-lg opacity-60">+</span>
    </div>
    <div className="flex h-10 items-center gap-4 bg-[#f6f5f3] px-3">
      <ChromeIcon path="m14 6-6 6 6 6M8 12h12" muted />
      <ChromeIcon path="m10 6 6 6-6 6M16 12H4" muted />
      <ChromeIcon path="M19 8a8 8 0 1 0 1 8M19 3v5h-5" />
      <div className="flex h-7 min-w-0 flex-1 items-center gap-2 rounded-full border border-[#dedcd9] bg-[#eeece9] px-3 text-xs">
        <ChromeIcon path="M8 11V8a4 4 0 0 1 8 0v3M6 11h12v9H6z" />
        <span className="truncate"><span className="opacity-45">https://</span>adrianklisz.com<span className="opacity-60">{caseStudyRoute(caseStudy)}</span></span>
        <span className="ml-auto"><ChromeIcon path="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" /></span>
      </div>
      <ChromeIcon path="M12 16V3m-4 9 4 4 4-4M5 17v4h14v-4" />
      <span className="text-xl leading-none opacity-70">⋮</span>
    </div>
  </div>;
}
