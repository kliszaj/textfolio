// The Worker in front of the static site: /api/* is the typing leaderboard
// (api.ts), everything else is the Next.js export in out/.
import { handleApi, type D1Database } from "./api";

type Env = {
  DB: D1Database;
  ASSETS: { fetch(request: Request): Promise<Response> };
};

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env.DB);
      } catch (error) {
        console.error("leaderboard", error);
        return new Response(JSON.stringify({ error: "Leaderboard unavailable" }), {
          status: 503,
          headers: { "content-type": "application/json" },
        });
      }
    }
    return env.ASSETS.fetch(request);
  },
};

export default worker;
