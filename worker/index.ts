/**
 * TypeSetGo Worker stub.
 *
 * Matching static files are served from `dist` without hitting this handler.
 * Unmatched paths (SPA routes like /leaderboard) run this fetch() first; we
 * pass them to ASSETS, which applies single-page-application fallback.
 *
 * Add Worker-owned routes above the default pass-through as the Cloudflare
 * port grows (auth, API, etc.).
 */
export default {
  async fetch(request, env): Promise<Response> {
    // Future routes, e.g.:
    // const url = new URL(request.url);
    // if (url.pathname.startsWith("/api/")) {
    //   return handleApi(request, env);
    // }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
