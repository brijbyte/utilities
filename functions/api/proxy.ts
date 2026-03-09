/**
 * CORS proxy for the coding-agent plugin.
 *
 * Proxies requests to external APIs (LLM providers, OAuth token endpoints)
 * that don't support browser CORS. Deployed as a Cloudflare Pages Function
 * at /api/proxy.
 *
 * Usage: POST /api/proxy
 * Body: { url, method, headers, body }
 * Supports streaming responses (SSE passthrough).
 */

interface ProxyRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "https://utilities.brijbyte.com",
];

// Allowlisted URL prefixes to prevent open-proxy abuse
const ALLOWED_URL_PREFIXES = [
  "https://api.anthropic.com/",
  "https://console.anthropic.com/",
  "https://claude.ai/",
  "https://api.openai.com/",
  "https://api.githubcopilot.com/",
  "https://api.individual.githubcopilot.com/",
  "https://api.business.githubcopilot.com/",
  "https://api.enterprise.githubcopilot.com/",
  "https://copilot-proxy.githubusercontent.com/",
  "https://github.com/login/",
  "https://api.github.com/",
  "https://generativelanguage.googleapis.com/",
  "https://oauth2.googleapis.com/",
  "https://accounts.google.com/",
  "https://api.mistral.ai/",
  "https://api.groq.com/",
  "https://api.x.ai/",
  "https://openrouter.ai/",
  "https://api.cerebras.ai/",
  "https://us-east-1.amazonaws.com/",
  "https://bedrock-runtime.",
  "https://api.minimax.chat/",
  "https://chatgpt.com/",
  "https://api.us.antigravity.dev.corp.google.com/",
  "https://gateway.ai.cloudflare.com/",
  "https://api.vercel.ai/",
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Proxy-URL",
    "Access-Control-Expose-Headers": "Content-Type, X-Request-Id",
    "Access-Control-Max-Age": "86400",
  };
}

function isAllowedUrl(url: string): boolean {
  return ALLOWED_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

export const onRequestOptions: PagesFunction = async (context) => {
  const origin = context.request.headers.get("Origin");
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
};

export const onRequestPost: PagesFunction = async (context) => {
  const origin = context.request.headers.get("Origin");
  const cors = corsHeaders(origin);

  try {
    const proxyReq = (await context.request.json()) as ProxyRequest;

    if (!proxyReq.url || !proxyReq.method) {
      return new Response(JSON.stringify({ error: "Missing url or method" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!isAllowedUrl(proxyReq.url)) {
      return new Response(JSON.stringify({ error: "URL not in allowlist" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Forward the request to the target URL
    const targetHeaders = new Headers(proxyReq.headers || {});
    // Remove host-related headers that would confuse the target
    targetHeaders.delete("host");
    targetHeaders.delete("origin");
    targetHeaders.delete("referer");

    const fetchInit: RequestInit = {
      method: proxyReq.method,
      headers: targetHeaders,
    };

    if (
      proxyReq.body &&
      proxyReq.method !== "GET" &&
      proxyReq.method !== "HEAD"
    ) {
      fetchInit.body = proxyReq.body;
    }

    const response = await fetch(proxyReq.url, fetchInit);

    // Check if this is a streaming response (SSE)
    const contentType = response.headers.get("content-type") || "";
    const isStreaming =
      contentType.includes("text/event-stream") ||
      contentType.includes("application/x-ndjson");

    if (isStreaming && response.body) {
      // Stream the response through
      const responseHeaders = new Headers(cors);
      responseHeaders.set("Content-Type", contentType);
      responseHeaders.set("Cache-Control", "no-cache");
      responseHeaders.set("Connection", "keep-alive");

      // Copy relevant headers from upstream
      for (const header of ["x-request-id", "request-id"]) {
        const val = response.headers.get(header);
        if (val) responseHeaders.set(header, val);
      }

      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    // Non-streaming: read full body and forward
    const responseBody = await response.text();
    const responseHeaders = new Headers(cors);
    responseHeaders.set(
      "Content-Type",
      response.headers.get("content-type") || "application/json",
    );

    // Copy relevant headers from upstream
    for (const header of ["x-request-id", "request-id", "retry-after"]) {
      const val = response.headers.get(header);
      if (val) responseHeaders.set(header, val);
    }

    return new Response(responseBody, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
};
