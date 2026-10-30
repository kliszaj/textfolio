// Tuning panels (the desk's settings, the case-study header) are tools, not
// something visitors should meet: they show in development and on any build
// served from this machine (localhost), never on the live site.
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$|\.localhost$/;

export function onLocalHost() {
  return process.env.NODE_ENV !== "production" || (typeof window !== "undefined" && LOCAL_HOST.test(window.location.hostname));
}

// `?capture` hides them, for screenshots (the share thumbnail).
export function showLocalTools() {
  return onLocalHost() && !(typeof window !== "undefined" && new URLSearchParams(window.location.search).has("capture"));
}

// `?at=HH:MM` (local only) sets the desk to that Stockholm time today, for
// screenshots; null without it.
export function localPreviewTime(): { hour: number; minute: number } | null {
  if (!onLocalHost() || typeof window === "undefined") return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(new URLSearchParams(window.location.search).get("at") ?? "");
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
}
