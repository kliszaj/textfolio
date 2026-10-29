import type { CSSProperties, ReactNode } from "react";
import type { WorkspaceScene } from "@/lib/workspace/scenes";

// App windows on the monitor's desktop, behind the browser window, changing
// through the day. Laid out in the monitor's own pixels (1536 x 600). The
// browser covers the middle, so each app sits on the side where its most
// recognisable part shows: Slack's sidebar, Claude Code's transcript and the
// prototype's phone on the left, Figma's properties panel and Meet's call bar
// on the right.

type AppId = "figma" | "slack" | "spotify" | "claude" | "meet" | "youtube" | "prototype";
type Side = "left" | "right";

const FRAMES: Record<Side, CSSProperties> = {
  left: { left: 24, top: 46, width: 660, height: 500 },
  right: { left: 852, top: 58, width: 660, height: 500 },
};

// At most two per time of day.
const OPEN_BY_SCENE: Record<WorkspaceScene, [AppId, Side][]> = {
  design: [["slack", "left"], ["figma", "right"]],
  meeting: [["prototype", "left"], ["meet", "right"]],
  coding: [["claude", "left"], ["spotify", "right"]],
  video: [["youtube", "left"], ["spotify", "right"]],
  sleep: [],
};
const PLACEMENTS = Array.from(
  new Set(Object.values(OPEN_BY_SCENE).flat().map(([app, side]) => `${app}:${side}`)),
).map((key) => key.split(":") as [AppId, Side]);

// Cross-fades a beat after a time change, still ahead of the case study swap.
const FADE = "opacity 400ms ease 800ms, transform 500ms cubic-bezier(0.22, 1, 0.36, 1) 800ms";
const UI_FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const MONO_FONT = "ui-monospace, Menlo, Consolas, monospace";

function TrafficLights({ className = "" }: { className?: string }) {
  return (
    <span className={`flex gap-1.5 ${className}`}>
      {["#ff5f57", "#febc2e", "#28c840"].map((color) => <span key={color} className="size-2.5 rounded-full" style={{ backgroundColor: color }} />)}
    </span>
  );
}

const Icon = ({ d, size = 14, color = "currentColor", width = 1.7 }: { d: string; size?: number; color?: string; width?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d={d} /></svg>
);
const ICONS = {
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  hash: "M5 9h14M5 15h14M10 4 8 20M16 4l-2 16",
  chevron: "m6 9 6 6 6-6",
  plus: "M12 5v14M5 12h14",
  home: "M4 11 12 4l8 7v9h-5v-6H9v6H4z",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20h4",
  chat: "M4 5h16v11H8l-4 4z",
  mic: "M12 4a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v3",
  cam: "M4 7h11v10H4zM15 10l5-3v10l-5-3",
  cc: "M4 6h16v12H4zM10 10H8v4h2M16 10h-2v4h2",
  hand: "M8 12V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v7a6 6 0 0 1-6 6 6 6 0 0 1-5-3l-2-4a1.5 1.5 0 0 1 2.6-1.4L8 13",
  present: "M4 5h16v11H4zM12 9v4M10 11l2-2 2 2M9 20h6",
  dots: "M12 6h.01M12 12h.01M12 18h.01",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M18 19a6 6 0 0 0-3-5",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
  shuffle: "M4 7h3l10 10h3M4 17h3l3-3M14 10l3-3h3M18 5l2 2-2 2M18 15l2 2-2 2",
  prev: "M7 6v12M18 6l-9 6 9 6z",
  next: "M17 6v12M6 6l9 6-9 6z",
  repeat: "M4 12V9a3 3 0 0 1 3-3h12l-3-3M20 12v3a3 3 0 0 1-3 3H5l3 3",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  volume: "M4 9h4l5-4v14l-5-4H4zM17 9a4 4 0 0 1 0 6",
  menu: "M4 7h16M4 12h16M4 17h16",
  thumb: "M7 11v9H4v-9zM7 11l4-7a2 2 0 0 1 2 2v4h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7",
  share: "M14 5l6 6-6 6M20 11H9a5 5 0 0 0-5 5v2",
  frame: "M8 3v18M16 3v18M3 8h18M3 16h18",
  text: "M5 6V4h14v2M12 4v16M9 20h6",
  rect: "M4 5h16v14H4z",
  pen: "M12 19l7-7-3-3-7 7-1 4zM14 7l3 3",
  cursor: "M5 3l14 8-6 2-2 6z",
  comment: "M4 12a8 8 0 1 1 3.5 6.6L4 20l1.2-3.6A8 8 0 0 1 4 12z",
};

/* ---------- Slack ---------- */

function Slack() {
  const messages = [
    { name: "Maya Lindqvist", time: "9:12 AM", color: "#d58c6b", lines: ["Morning! Pushed the new case study layouts to the file 🎉", "Would love eyes on the facts column before standup."] },
    { name: "Alex Chen", time: "9:20 AM", color: "#6b8fd5", lines: ["Looks great. The right column reads way better at 1440."], reactions: ["🔥 3", "👀 1"] },
    { name: "Adrian", time: "9:31 AM", color: "#7fb08f", lines: ["Thanks both — tightening the header spacing now,", "then I'll share a prototype link here."], image: true },
  ];
  return (
    <div className="absolute inset-0 flex" style={{ fontFamily: UI_FONT, fontSize: 13 }}>
      <div className="flex w-14 flex-col items-center gap-4 pt-10" style={{ backgroundColor: "#121016" }}>
        <span className="grid size-9 place-items-center rounded-lg bg-white text-sm font-bold" style={{ color: "#121016" }}>S</span>
        {[ICONS.home, ICONS.chat, ICONS.bell, ICONS.dots].map((d, i) => (
          <span key={d} className="grid size-9 place-items-center rounded-lg" style={{ backgroundColor: i === 0 ? "#ffffff2b" : undefined, color: "#e8dce8" }}><Icon d={d} size={17} /></span>
        ))}
      </div>
      <div className="flex w-52 flex-col pt-3 pr-2 pl-3" style={{ backgroundColor: "#1b1a1f", color: "#b9b8bd" }}>
        <TrafficLights className="mb-3" />
        <div className="mb-4 flex items-center gap-1 text-[15px] font-bold text-white">Studio <Icon d={ICONS.chevron} size={13} /></div>
        <div className="mb-1 flex items-center gap-1 text-[13px]"><Icon d={ICONS.chevron} size={11} /> Channels</div>
        {["general", "design", "inspiration", "portfolio", "random"].map((channel) => (
          <div key={channel} className="flex items-center gap-2 rounded-md px-2 py-[3px]" style={channel === "design" ? { backgroundColor: "#1164a3", color: "#fff" } : channel === "portfolio" ? { color: "#fff", fontWeight: 700 } : undefined}>
            <Icon d={ICONS.hash} size={13} /> {channel}
          </div>
        ))}
        <div className="mt-4 mb-1 flex items-center gap-1 text-[13px]"><Icon d={ICONS.chevron} size={11} /> Direct messages</div>
        {[["Maya Lindqvist", "#2bac76"], ["Alex Chen", "#2bac76"], ["Sam Okafor", "transparent"], ["Lou Martin", "#2bac76"]].map(([name, presence]) => (
          <div key={name} className="flex items-center gap-2 px-2 py-[3px]">
            <span className="relative size-4 rounded" style={{ backgroundColor: "#5d5a66" }}>
              <span className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full border border-[#1b1a1f]" style={{ backgroundColor: presence, borderColor: presence === "transparent" ? "#b9b8bd" : "#1b1a1f" }} />
            </span>
            {name}
          </div>
        ))}
      </div>
      <div className="flex flex-1 flex-col" style={{ backgroundColor: "#1a1d21", color: "#d1d2d3" }}>
        <div className="flex h-12 items-center justify-between border-b border-[#35373b] px-4">
          <span className="flex items-center gap-1 text-[15px] font-bold"><Icon d={ICONS.hash} size={15} /> design <Icon d={ICONS.chevron} size={12} /></span>
          <span className="flex items-center gap-1 rounded-md border border-[#35373b] px-2 py-0.5 text-xs text-[#9a9b9e]">
            <span className="flex -space-x-1">{["#d58c6b", "#6b8fd5", "#7fb08f"].map((c) => <span key={c} className="size-4 rounded border border-[#1a1d21]" style={{ backgroundColor: c }} />)}</span> 12
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-hidden px-4 pt-4">
          <div className="flex items-center gap-3 text-xs font-bold text-[#9a9b9e]"><span className="h-px flex-1 bg-[#35373b]" /><span className="rounded-full border border-[#35373b] px-3 py-0.5">Today</span><span className="h-px flex-1 bg-[#35373b]" /></div>
          {messages.map((message) => (
            <div key={message.name} className="flex gap-2.5">
              <span className="size-9 shrink-0 rounded-md" style={{ backgroundColor: message.color }} />
              <div className="min-w-0 flex-1">
                <div><span className="font-bold text-white">{message.name}</span> <span className="text-xs text-[#9a9b9e]">{message.time}</span></div>
                {message.lines.map((line) => <div key={line} className="leading-snug">{line}</div>)}
                {message.image && <div className="mt-2 h-20 w-36 rounded-md border border-[#35373b]" style={{ background: "linear-gradient(135deg, #f5ede6 55%, #a9bca7 55%)" }} />}
                {message.reactions && <div className="mt-1.5 flex gap-1.5">{message.reactions.map((r) => <span key={r} className="rounded-full border border-[#1d9bd1] bg-[#1d2f3b] px-2 text-xs">{r}</span>)}</div>}
              </div>
            </div>
          ))}
        </div>
        <div className="m-4 mt-2 rounded-lg border border-[#565856] px-3 pt-2 pb-1.5 text-[#868686]">
          Message #design
          <div className="mt-2 flex items-center gap-3 text-[#9a9b9e]"><Icon d={ICONS.plus} size={15} /><span className="font-bold">Aa</span><span>☺</span><span>@</span><span className="ml-auto grid size-6 place-items-center rounded bg-[#007a5a] text-white">➤</span></div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Figma ---------- */

function Figma() {
  const layers = [
    ["frame", "Desktop — Case study", 0, true],
    ["frame", "Header", 1],
    ["text", "Title", 2],
    ["rect", "Home button", 2],
    ["frame", "Facts column", 1],
    ["frame", "Overview", 1],
    ["frame", "Media grid", 1],
    ["frame", "Mobile — Case study", 0],
    ["frame", "Home — Stack", 0],
  ] as const;
  const field = (label: string, value: string) => (
    <span className="flex h-6 items-center gap-2 rounded bg-[#383838] px-2"><span className="text-[#9a9a9a]">{label}</span>{value}</span>
  );
  return (
    <div className="absolute inset-0 flex" style={{ fontFamily: UI_FONT, fontSize: 11, color: "#e6e6e6", backgroundColor: "#1e1e1e" }}>
      <div className="flex w-48 flex-col border-r border-[#383838] bg-[#2c2c2c]">
        <div className="flex items-center gap-2 px-3 pt-2.5"><TrafficLights /></div>
        <div className="flex items-center gap-1.5 px-3 pt-3 pb-2 font-semibold"><span className="grid size-5 place-items-center rounded bg-[#e6e6e6] text-[9px] text-[#1e1e1e]">F</span> Portfolio 2026 <Icon d={ICONS.chevron} size={11} /></div>
        <div className="flex gap-3 border-b border-[#383838] px-3 pb-2 font-semibold"><span>File</span><span className="text-[#9a9a9a]">Assets</span></div>
        <div className="px-3 pt-2 pb-1 font-semibold text-[#9a9a9a]">Pages</div>
        {["Case studies", "Home", "Archive"].map((page, i) => <div key={page} className="px-3 py-[3px]" style={{ fontWeight: i === 0 ? 600 : undefined }}>{page}</div>)}
        <div className="mt-2 border-t border-[#383838] px-3 pt-2 pb-1 font-semibold text-[#9a9a9a]">Layers</div>
        {layers.map(([kind, name, depth, selected]) => (
          <div key={name} className="flex items-center gap-1.5 py-[3px]" style={{ paddingLeft: 12 + depth * 14, backgroundColor: selected ? "#0d3b66" : undefined }}>
            <Icon d={ICONS[kind]} size={11} color={kind === "frame" ? "#9a9a9a" : "#7a7a7a"} />{name}
          </div>
        ))}
      </div>
      <div className="relative flex-1">
        <span className="absolute top-7 left-8 text-[10px] text-[#9a9a9a]">Desktop — Case study</span>
        <div className="absolute top-12 right-8 bottom-16 left-8 flex flex-col bg-[#f5ede6] shadow-sm outline-[1.5px] outline-[#0d99ff]">
          <div className="flex h-20 items-end justify-between px-5 pb-3" style={{ backgroundColor: "#ff4fd8" }}>
            <span className="text-[22px] leading-none font-black text-[#1c1c1c]">Seamless Strategy</span>
            <span className="size-6 rounded-full bg-[#ffd400]" />
          </div>
          <div className="flex flex-1 gap-4 p-5">
            <div className="flex flex-1 flex-col gap-1.5">
              <span className="mb-1 h-2.5 w-4/5 rounded-sm bg-[#1c1c1c]" />
              {[100, 96, 92, 98, 70].map((w, i) => <span key={i} className="h-1.5 rounded-sm bg-[#1c1c1c]/30" style={{ width: `${w}%` }} />)}
              <span className="mt-3 flex-1 rounded bg-[#a9bca7]" />
            </div>
            <div className="flex w-16 flex-col gap-2">{[0, 1, 2].map((i) => <span key={i} className="h-5 rounded-sm bg-[#1c1c1c]/15" />)}</div>
          </div>
          {[["-left-1 -top-1"], ["-right-1 -top-1"], ["-left-1 -bottom-1"], ["-right-1 -bottom-1"]].map(([pos]) => <span key={pos} className={`absolute size-2 border border-[#0d99ff] bg-white ${pos}`} />)}
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 rounded bg-[#0d99ff] px-1.5 py-0.5 text-[10px] text-white">1440 × 1024</span>
        </div>
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl bg-[#2c2c2c] p-1.5 shadow-md ring-1 ring-black/40">
          {[ICONS.cursor, ICONS.frame, ICONS.rect, ICONS.pen, ICONS.text, ICONS.comment].map((d, i) => (
            <span key={d} className="grid size-7 place-items-center rounded-md" style={{ backgroundColor: i === 0 ? "#0d99ff" : undefined, color: i === 0 ? "#fff" : "#e6e6e6" }}><Icon d={d} size={14} /></span>
          ))}
        </div>
      </div>
      <div className="flex w-56 flex-col gap-3 border-l border-[#383838] bg-[#2c2c2c] px-3 pt-2.5">
        <div className="flex items-center justify-between">
          <span className="flex -space-x-1.5">{["#f24e1e", "#a259ff", "#1abcfe"].map((c) => <span key={c} className="size-6 rounded-full border-2 border-[#2c2c2c]" style={{ backgroundColor: c }} />)}</span>
          <span className="rounded-md bg-[#0d99ff] px-3 py-1 font-semibold text-white">Share</span>
        </div>
        <div className="flex gap-3 border-b border-[#383838] pb-2 font-semibold"><span>Design</span><span className="text-[#9a9a9a]">Prototype</span><span className="ml-auto text-[#9a9a9a]">100%</span></div>
        <div className="font-semibold">Frame</div>
        <div className="grid grid-cols-2 gap-1.5">{field("X", "0")}{field("Y", "0")}{field("W", "1440")}{field("H", "1024")}</div>
        <div className="flex items-center justify-between border-t border-[#383838] pt-3 font-semibold">Auto layout <Icon d={ICONS.plus} size={12} /></div>
        <div className="grid grid-cols-2 gap-1.5">{field("↕", "24")}{field("⊞", "56")}</div>
        <div className="flex items-center justify-between border-t border-[#383838] pt-3 font-semibold">Fill <Icon d={ICONS.plus} size={12} /></div>
        <span className="flex h-6 items-center gap-2 rounded bg-[#383838] px-2"><span className="size-3.5 rounded-sm border border-black/10 bg-[#f5ede6]" />F5EDE6<span className="ml-auto text-[#9a9a9a]">100%</span></span>
        <div className="flex items-center justify-between border-t border-[#383838] pt-3 font-semibold">Stroke <Icon d={ICONS.plus} size={12} /></div>
        <div className="flex items-center justify-between border-t border-[#383838] pt-3 font-semibold">Effects <Icon d={ICONS.plus} size={12} /></div>
        <div className="flex items-center justify-between border-t border-[#383838] pt-3 font-semibold">Export <Icon d={ICONS.plus} size={12} /></div>
      </div>
    </div>
  );
}

/* ---------- Coded mobile prototype in a browser ---------- */

function Prototype() {
  const tree = [
    [0, "<main class=\"home\">"],
    [1, "<header class=\"nav\">…</header>"],
    [1, "<section class=\"hero\">"],
    [2, "<h1>Made for people.</h1>"],
    [2, "<a class=\"cta\">Explore work</a>"],
    [1, "</section>"],
    [1, "<ul class=\"cards\">…</ul>"],
    [0, "</main>"],
  ] as const;
  return (
    <div className="absolute inset-0 flex flex-col" style={{ backgroundColor: "#202124", fontFamily: UI_FONT, fontSize: 11, color: "#c4c7c5" }}>
      <div className="flex h-9 shrink-0 items-end gap-2 bg-[#1f1f1f] px-3">
        <TrafficLights className="mb-3" />
        <span className="ml-2 flex h-7 w-48 items-center gap-2 rounded-t-lg bg-[#35363a] px-3 text-[#e3e3e3]">
          <span className="size-3 rounded-sm bg-[#f5ede6]" /> Portfolio — mobile
        </span>
        <span className="mb-2 text-sm">+</span>
      </div>
      <div className="flex h-9 shrink-0 items-center gap-3 bg-[#35363a] px-3">
        <span className="opacity-60">←  →  ↻</span>
        <span className="flex h-6 flex-1 items-center rounded-full bg-[#202124] px-3 text-[#e3e3e3]">localhost:3000</span>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex flex-1 flex-col">
          <div className="flex h-7 shrink-0 items-center justify-center gap-3 border-b border-[#3c3c3c] text-[10px]">
            <span>Dimensions: iPhone 15 Pro ▾</span><span className="text-[#e3e3e3]">393 × 852</span><span>100% ▾</span>
          </div>
          <div className="flex flex-1 items-start justify-start px-10 pt-4">
            <div className="h-[380px] w-[180px] rounded-[30px] bg-black p-[7px] shadow-xl ring-1 ring-[#555]">
              <div className="relative flex h-full flex-col overflow-hidden rounded-[24px] bg-[#f5ede6] px-3.5 pt-3 text-[#1c1c1c]">
                <span className="mx-auto h-4 w-14 rounded-full bg-black" />
                <div className="mt-3 flex items-center justify-between text-[9px] font-black tracking-wide"><span>ADRIAN</span><span className="flex flex-col gap-[3px]"><span className="h-[2px] w-3.5 bg-[#1c1c1c]" /><span className="h-[2px] w-3.5 bg-[#1c1c1c]" /></span></div>
                <div className="mt-5 text-[22px] leading-[0.95] font-black">Made for people.</div>
                <span className="mt-3 w-fit rounded-full bg-[#1c1c1c] px-2.5 py-1 text-[8px] font-semibold text-[#f5ede6]">Explore work ↗</span>
                <div className="mt-4 flex flex-col gap-2">
                  {[["#1ed760", "Spotify Jam"], ["#ff4fd8", "Seamless Strategy"], ["#ff9f1c", "Focals by North"]].map(([color, title]) => (
                    <div key={title} className="flex h-14 flex-col justify-end rounded-lg p-2 text-[10px] font-black" style={{ backgroundColor: color }}>{title}</div>
                  ))}
                </div>
                <span className="absolute bottom-1.5 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-black/70" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex w-60 flex-col border-l border-[#3c3c3c] bg-[#282828]" style={{ fontFamily: MONO_FONT, fontSize: 10 }}>
          <div className="flex gap-3 border-b border-[#3c3c3c] px-3 py-1.5" style={{ fontFamily: UI_FONT }}><span className="text-[#a8c7fa]">Elements</span><span>Console</span><span>Network</span></div>
          {tree.map(([depth, node], i) => (
            <div key={i} className="truncate py-[2px]" style={{ paddingLeft: 10 + depth * 12, backgroundColor: i === 3 ? "#0b3a6b" : undefined, color: "#a8c7fa" }}>{node}</div>
          ))}
          <div className="mt-2 border-t border-[#3c3c3c] px-3 pt-2 leading-relaxed" style={{ color: "#c4c7c5" }}>
            <div className="text-[#e3e3e3]">h1 {"{"}</div>
            <div className="pl-3">font-size: <span className="text-[#f28b54]">clamp(3rem, 14vw, 5rem)</span>;</div>
            <div className="pl-3">line-height: <span className="text-[#f28b54]">0.95</span>;</div>
            <div className="text-[#e3e3e3]">{"}"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Google Meet ---------- */

function Person({ skin, hair, shirt, bg }: { skin: string; hair: string; shirt: string; bg: string }) {
  // A head-and-shoulders silhouette in front of a soft room background.
  return (
    <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
      <rect width="160" height="100" fill={bg} />
      <rect x="104" y="12" width="34" height="46" rx="2" fill="#ffffff14" />
      <ellipse cx="80" cy="108" rx="44" ry="30" fill={shirt} />
      <rect x="73" y="62" width="14" height="14" fill={skin} />
      <ellipse cx="80" cy="50" rx="17" ry="20" fill={skin} />
      <path d="M62 48c0-16 8-24 18-24s18 8 18 24c-4-8-10-11-18-11s-14 3-18 11z" fill={hair} />
    </svg>
  );
}

function Meet() {
  const tiles = [
    { name: "Maya Lindqvist", person: { skin: "#e1b39a", hair: "#3b2a22", shirt: "#4f6d7a", bg: "#5a6b73" }, speaking: true },
    { name: "Alex Chen", person: { skin: "#d9a982", hair: "#141414", shirt: "#8a6d5a", bg: "#6e625c" } },
    { name: "Sam Okafor", person: { skin: "#8d5a3f", hair: "#1a1210", shirt: "#3e5a48", bg: "#4d5a52" }, muted: true },
    { name: "You", person: { skin: "#eac5a2", hair: "#6b4a32", shirt: "#2f3b4a", bg: "#59546b" } },
  ];
  return (
    <div className="absolute inset-0 flex flex-col pt-8" style={{ backgroundColor: "#202124", fontFamily: UI_FONT, fontSize: 13, color: "#e8eaed" }}>
      <TrafficLights className="absolute top-2.5 left-3" />
      <div className="grid flex-1 grid-cols-2 gap-2.5 px-3">
        {tiles.map((tile) => (
          <div key={tile.name} className="relative overflow-hidden rounded-xl" style={{ outline: tile.speaking ? "3px solid #8ab4f8" : undefined }}>
            <Person {...tile.person} />
            <span className="absolute bottom-2 left-3 text-[13px] font-medium drop-shadow">{tile.name}</span>
            <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full" style={{ backgroundColor: tile.muted ? "#202124cc" : "#1a73e8" }}>
              {tile.muted ? <Icon d={ICONS.mic} size={12} color="#ea4335" /> : <span className="flex items-end gap-[2px]">{[5, 9, 6].map((h, i) => <span key={i} className="w-[2px] rounded bg-white" style={{ height: h }} />)}</span>}
            </span>
          </div>
        ))}
      </div>
      <div className="flex h-16 items-center px-4">
        <span className="flex-1 text-[14px]">11:02 <span className="mx-1 text-[#9aa0a6]">|</span> Design sync</span>
        <span className="flex items-center gap-2">
          {[ICONS.mic, ICONS.cam, ICONS.cc, ICONS.hand, ICONS.present, ICONS.dots].map((d) => <span key={d} className="grid size-10 place-items-center rounded-full bg-[#3c4043]"><Icon d={d} size={18} /></span>)}
          <span className="grid h-10 w-14 place-items-center rounded-full bg-[#ea4335]"><Icon d="M3 14c5-5 13-5 18 0l-2 2-3-2v-2a10 10 0 0 0-8 0v2l-3 2z" size={20} /></span>
        </span>
        <span className="flex flex-1 justify-end gap-4 text-[#e8eaed]">{[ICONS.info, ICONS.people, ICONS.chat].map((d) => <Icon key={d} d={d} size={18} />)}</span>
      </div>
    </div>
  );
}

/* ---------- Claude Code ---------- */

function ClaudeCode() {
  const dim = "#8b8580";
  const ok = "#7fb88a";
  return (
    <div className="absolute inset-0 flex flex-col" style={{ backgroundColor: "#1c1b1a", fontFamily: MONO_FONT, fontSize: 12, color: "#e6e1dc" }}>
      <div className="relative flex h-7 shrink-0 items-center justify-center border-b border-black/40 bg-[#2a2928] text-[11px]" style={{ fontFamily: UI_FONT, color: "#a8a29d" }}>
        <TrafficLights className="absolute left-3" />adrian — claude — ~/portfolio
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-hidden px-4 pt-3 leading-[1.45]">
        <div className="w-[26rem] rounded-md border px-3 py-2" style={{ borderColor: "#d97757" }}>
          <div><span style={{ color: "#d97757" }}>✻</span> Welcome to <span className="font-bold">Claude Code</span>!</div>
          <div className="mt-1.5" style={{ color: dim }}>/help for help, /status for your current setup</div>
          <div className="mt-1.5" style={{ color: dim }}>cwd: /Users/adrian/portfolio</div>
        </div>
        <div className="mt-1" style={{ color: dim }}>&gt; Make the mobile nav feel snappier</div>
        <div><span style={{ color: "#e6e1dc" }}>⏺</span> I&apos;ll look at the navigation component first.</div>
        <div><span style={{ color: ok }}>⏺</span> <span className="font-bold">Read</span>(components/MobileNav.tsx)</div>
        <div style={{ color: dim }}>  ⎿  Read 142 lines</div>
        <div><span style={{ color: ok }}>⏺</span> <span className="font-bold">Update</span>(components/MobileNav.tsx)</div>
        <div style={{ color: dim }}>  ⎿  Updated components/MobileNav.tsx with 4 additions and 2 removals</div>
        <div className="ml-6 rounded-sm" style={{ fontSize: 11 }}>
          <div style={{ color: dim }}>   38    const open = useMenuState();</div>
          <div style={{ backgroundColor: "#4a2a2a", color: "#e8b4b4" }}>   39 -  transition: &quot;transform 320ms ease&quot;,</div>
          <div style={{ backgroundColor: "#263f2c", color: "#b6e3bd" }}>   39 +  transition: &quot;transform 180ms&quot;,</div>
          <div style={{ backgroundColor: "#263f2c", color: "#b6e3bd" }}>   40 +  easing: spring(0.22, 1, 0.36),</div>
        </div>
        <div><span style={{ color: "#e6e1dc" }}>⏺</span> Done — the menu now opens in 180ms with a spring, and</div>
        <div className="pl-4">closes on the next tap anywhere outside it.</div>
      </div>
      <div className="mx-3 mb-1 rounded-md border border-[#5a5652] px-3 py-1.5"><span style={{ color: dim }}>&gt;</span> <span className="inline-block h-3.5 w-2 translate-y-0.5 bg-[#e6e1dc]" /></div>
      <div className="mx-4 mb-2 text-[11px]" style={{ color: dim }}>? for shortcuts</div>
    </div>
  );
}

/* ---------- Spotify ---------- */

function Cover({ hue, className = "" }: { hue: number; className?: string }) {
  return <span className={`block shrink-0 rounded ${className}`} style={{ background: `linear-gradient(135deg, hsl(${hue} 45% 62%), hsl(${hue + 40} 50% 32%))` }} />;
}

function Spotify() {
  const tracks = [
    ["Slow Morning", "Ólafur Arnalds", "3:42"],
    ["Paper Boats", "Nils Frahm", "4:18"],
    ["Low Tide", "Hania Rani", "5:03"],
    ["Orbit", "Bonobo", "4:51"],
    ["Warm Static", "Tycho", "3:57"],
  ];
  return (
    <div className="absolute inset-0 flex flex-col gap-2 bg-black p-2 pt-8" style={{ fontFamily: UI_FONT, fontSize: 12, color: "#b3b3b3" }}>
      <TrafficLights className="absolute top-2.5 left-3" />
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="flex w-16 flex-col items-center gap-2.5 rounded-lg bg-[#121212] pt-3">
          {[20, 120, 200, 300, 40].map((hue) => <Cover key={hue} hue={hue} className="size-10" />)}
        </div>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg" style={{ background: "linear-gradient(180deg, #5b4a8a 0, #2a2340 160px, #121212 260px)" }}>
          <div className="flex items-end gap-4 p-4 pt-6">
            <Cover hue={265} className="size-28 shadow-xl" />
            <div className="min-w-0">
              <div className="text-[11px] text-white">Playlist</div>
              <div className="text-[40px] leading-none font-black tracking-tight text-white">Focus Flow</div>
              <div className="mt-2 text-[11px]"><span className="font-bold text-white">Adrian</span> • 48 songs, 3 hr 12 min</div>
            </div>
          </div>
          <div className="flex items-center gap-4 px-4 pb-2">
            <span className="grid size-11 place-items-center rounded-full bg-[#1ed760]"><span className="ml-0.5 border-y-[7px] border-l-[11px] border-y-transparent border-l-black" /></span>
            <Icon d={ICONS.shuffle} size={20} /><Icon d={ICONS.dots} size={20} />
          </div>
          {tracks.map(([title, artist, time], i) => (
            <div key={title} className="flex items-center gap-3 px-4 py-1.5" style={{ backgroundColor: i === 1 ? "#ffffff14" : undefined }}>
              <span className="w-4 text-right" style={{ color: i === 1 ? "#1ed760" : undefined }}>{i + 1}</span>
              <Cover hue={40 + i * 55} className="size-8" />
              <span className="min-w-0 flex-1"><span className="block truncate" style={{ color: i === 1 ? "#1ed760" : "#fff" }}>{title}</span><span className="text-[11px]">{artist}</span></span>
              <span>{time}</span>
            </div>
          ))}
        </div>
        <div className="flex w-48 flex-col gap-3 rounded-lg bg-[#121212] p-3">
          <span className="text-[13px] font-bold text-white">Paper Boats</span>
          <Cover hue={95} className="aspect-square w-full" />
          <div><div className="text-[17px] font-bold text-white">Paper Boats</div><div>Nils Frahm</div></div>
          <div className="mt-auto rounded-lg bg-[#242424] p-2.5"><div className="font-bold text-white">About the artist</div><div className="mt-1 text-[11px] leading-snug">Pianist and composer working between acoustic and electronic sound.</div></div>
        </div>
      </div>
      <div className="flex h-14 items-center gap-3 px-2">
        <Cover hue={95} className="size-11" />
        <div className="w-36"><div className="text-white">Paper Boats</div><div className="text-[11px]">Nils Frahm</div></div>
        <Icon d={ICONS.heart} size={15} color="#1ed760" />
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <span className="flex items-center gap-5 text-white">
            <Icon d={ICONS.shuffle} size={15} color="#1ed760" /><Icon d={ICONS.prev} size={15} />
            <span className="grid size-8 place-items-center rounded-full bg-white"><span className="flex gap-[3px]"><span className="h-3 w-[3px] bg-black" /><span className="h-3 w-[3px] bg-black" /></span></span>
            <Icon d={ICONS.next} size={15} /><Icon d={ICONS.repeat} size={15} />
          </span>
          <span className="flex w-full max-w-xs items-center gap-2 text-[10px]">1:37<span className="h-1 flex-1 rounded-full bg-[#4d4d4d]"><span className="block h-1 w-[38%] rounded-full bg-white" /></span>4:18</span>
        </div>
        <span className="flex w-28 items-center gap-2"><Icon d={ICONS.volume} size={15} /><span className="h-1 flex-1 rounded-full bg-[#4d4d4d]"><span className="block h-1 w-2/3 rounded-full bg-white" /></span></span>
      </div>
    </div>
  );
}

/* ---------- YouTube ---------- */

function YouTube() {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ backgroundColor: "#0f0f0f", fontFamily: UI_FONT, fontSize: 12, color: "#f1f1f1" }}>
      <div className="flex h-12 shrink-0 items-center gap-4 px-4 pt-3">
        <TrafficLights />
        <Icon d={ICONS.menu} size={18} />
        <span className="flex items-center gap-1 text-[15px] font-bold tracking-tight">
          <span className="grid h-4 w-6 place-items-center rounded-[5px] bg-[#ff0033]"><span className="ml-0.5 border-y-[4px] border-l-[6px] border-y-transparent border-l-white" /></span>YouTube
        </span>
        <span className="ml-6 flex h-8 flex-1 items-center rounded-full border border-[#303030] bg-[#121212] px-4 text-[#888]">Search</span>
        <span className="grid size-8 place-items-center rounded-full bg-[#222]"><Icon d={ICONS.mic} size={16} /></span>
      </div>
      <div className="flex min-h-0 flex-1 gap-4 px-4 pt-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl">
            <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
              <defs><linearGradient id="yt-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#284c6a" /><stop offset=".62" stopColor="#df987f" /><stop offset="1" stopColor="#edc997" /></linearGradient></defs>
              <rect width="160" height="90" fill="url(#yt-sky)" />
              <circle cx="104" cy="40" r="9" fill="#ffe6ac" />
              <path d="M0 62 22 44l16 10 22-20 26 22 18-12 24 16 32-18v48H0z" fill="#3c6270" />
              <path d="M0 72 30 58l24 10 30-14 30 16 22-8 24 10v18H0z" fill="#22404e" />
              <path d="M0 80 40 72l40 6 40-8 40 8v12H0z" fill="#142c38" />
            </svg>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-6 pb-2">
              <div className="mb-2 h-[3px] rounded-full bg-white/30"><div className="relative h-[3px] w-[27%] rounded-full bg-[#ff0033]"><span className="absolute -top-[3px] -right-1 size-2.5 rounded-full bg-[#ff0033]" /></div></div>
              <div className="flex items-center gap-4 text-[11px]"><span className="flex gap-[3px]"><span className="h-3 w-[3px] bg-white" /><span className="h-3 w-[3px] bg-white" /></span><Icon d={ICONS.next} size={14} /><Icon d={ICONS.volume} size={14} />12:48 / 48:00<span className="ml-auto rounded bg-white/15 px-1 text-[10px]">4K</span></div>
            </div>
          </div>
          <div className="text-[16px] leading-tight font-bold">A quiet evening in the mountains — 4K ambient for slow evenings</div>
          <div className="flex items-center gap-2.5">
            <span className="size-9 rounded-full" style={{ background: "linear-gradient(135deg, #a88379, #685e88)" }} />
            <span><div className="font-bold">Still Studio</div><div className="text-[11px] text-[#aaa]">1.2M subscribers</div></span>
            <span className="ml-2 rounded-full bg-[#f1f1f1] px-3.5 py-1.5 font-bold text-[#0f0f0f]">Subscribe</span>
            <span className="ml-auto flex items-center gap-2 rounded-full bg-[#272727] px-3 py-1.5"><Icon d={ICONS.thumb} size={14} /> 24K</span>
            <span className="flex items-center gap-1.5 rounded-full bg-[#272727] px-3 py-1.5"><Icon d={ICONS.share} size={14} /> Share</span>
          </div>
        </div>
        <div className="flex w-44 flex-col gap-3">
          {[["A desk worth coming home to", "#667a89"], ["Making things, slowly", "#a88379"], ["Late night studio radio", "#685e88"], ["Rain on the studio roof", "#4f6a63"]].map(([title, color]) => (
            <div key={title} className="flex gap-2">
              <span className="h-12 w-20 shrink-0 rounded-lg" style={{ backgroundColor: color }} />
              <span className="text-[11px] leading-snug font-semibold">{title}<span className="block font-normal text-[#aaa]">Still Studio</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const APPS: Record<AppId, () => ReactNode> = { figma: Figma, slack: Slack, spotify: Spotify, claude: ClaudeCode, meet: Meet, youtube: YouTube, prototype: Prototype };

export function DesktopWindows({ scene }: { scene: WorkspaceScene }) {
  const open = OPEN_BY_SCENE[scene];
  return (
    <>
      {PLACEMENTS.map(([app, side]) => {
        const Body = APPS[app];
        const shown = open.some(([a, s]) => a === app && s === side);
        return (
          <div
            key={`${app}:${side}`}
            aria-hidden="true"
            className="absolute overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/20"
            style={{ ...FRAMES[side], opacity: shown ? 1 : 0, transform: shown ? "none" : "translateY(10px)", transition: FADE }}
          >
            <Body />
          </div>
        );
      })}
    </>
  );
}
