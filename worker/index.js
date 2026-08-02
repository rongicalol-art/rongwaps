// Cloudflare-compatible static worker entry used by Sites.
// The Vite build remains the source of truth for all client assets.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const response = await env.ASSETS.fetch(request);
    const distResponse = response.status === 404
      ? await env.ASSETS.fetch(new Request(new URL(`/dist${url.pathname}`, request.url), request))
      : response;

    // Let client-side routing handle deep links while preserving real assets
    // and API responses from the asset binding.
    if (distResponse.status === 404 && request.method === "GET" &&
        (request.headers.get("accept") || "").includes("text/html")) {
      const index = await env.ASSETS.fetch(new Request(new URL("/index.html", url), request));
      return index.status === 404
        ? env.ASSETS.fetch(new Request(new URL("/dist/index.html", url), request))
        : index;
    }

    return distResponse;
  },
};
