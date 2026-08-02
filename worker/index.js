// Cloudflare-compatible static worker entry used by Sites.
// The Vite build remains the source of truth for all client assets.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const response = await env.ASSETS.fetch(request);

    // Let client-side routing handle deep links while preserving real assets
    // and API responses from the asset binding.
    if (response.status === 404 && request.method === "GET" &&
        (request.headers.get("accept") || "").includes("text/html")) {
      return env.ASSETS.fetch(new Request(new URL("/index.html", url), request));
    }

    return response;
  },
};
