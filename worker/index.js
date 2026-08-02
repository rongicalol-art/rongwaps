// Cloudflare-compatible static worker entry used by Sites.
// The Vite build remains the source of truth for all client assets.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const response = await env.ASSETS.fetch(request);
    const candidatePaths = [
      url.pathname,
      `/dist${url.pathname}`,
      `/dist/client${url.pathname}`,
      `/client${url.pathname}`,
    ];
    let distResponse = response;
    for (const candidate of candidatePaths.slice(1)) {
      if (distResponse.status !== 404) break;
      distResponse = await env.ASSETS.fetch(new Request(new URL(candidate, request.url), request));
    }

    // Let client-side routing handle deep links while preserving real assets
    // and API responses from the asset binding.
    if (distResponse.status === 404 && request.method === "GET" &&
        (request.headers.get("accept") || "").includes("text/html")) {
      for (const candidate of ["/index.html", "/dist/index.html", "/dist/client/index.html", "/client/index.html"]) {
        const index = await env.ASSETS.fetch(new Request(new URL(candidate, url), request));
        if (index.status !== 404) return index;
      }
    }

    return distResponse;
  },
};
