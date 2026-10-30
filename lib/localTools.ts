// Tuning panels (the desk's settings, the case-study header) are tools, not
// something visitors should meet: they show in development and on any build
// served from this machine (localhost), never on the live site.
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$|\.localhost$/;

export function showLocalTools() {
  return process.env.NODE_ENV !== "production" || (typeof window !== "undefined" && LOCAL_HOST.test(window.location.hostname));
}
