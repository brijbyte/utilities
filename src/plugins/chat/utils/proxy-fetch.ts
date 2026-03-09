/**
 * Proxy fetch — intercepts outgoing fetch calls to external APIs and routes
 * them through our CORS proxy at /api/proxy.
 *
 * This is necessary because LLM provider APIs (Anthropic, OpenAI, etc.)
 * and OAuth token endpoints don't set CORS headers for browser origins.
 *
 * The proxy function wraps globalThis.fetch. It checks the URL against a
 * list of known external domains and, if matched, rewrites the request as
 * a POST to /api/proxy with the original request details in the body.
 */

const PROXY_ENDPOINT = "/api/proxy";

/**
 * URL prefixes that should be proxied.
 * Must match the allowlist in functions/api/proxy.ts.
 */
const PROXIED_PREFIXES = [
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
  "https://bedrock-runtime.",
  "https://api.minimax.chat/",
  "https://chatgpt.com/",
  "https://gateway.ai.cloudflare.com/",
  "https://api.vercel.ai/",
];

function shouldProxy(url: string): boolean {
  return PROXIED_PREFIXES.some((prefix) => url.startsWith(prefix));
}

/** The original global fetch */
const originalFetch = globalThis.fetch.bind(globalThis);

/**
 * Proxied fetch — transparently routes external API calls through /api/proxy.
 */
async function proxiedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  // Resolve URL
  let url: string;
  if (typeof input === "string") {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (input instanceof Request) {
    url = input.url;
  } else {
    return originalFetch(input, init);
  }

  if (!shouldProxy(url)) {
    return originalFetch(input, init);
  }

  // Extract headers from the request
  const headers: Record<string, string> = {};

  if (input instanceof Request) {
    input.headers.forEach((value, key) => {
      headers[key] = value;
    });
  }
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(init.headers)) {
      for (const [key, value] of init.headers) {
        headers[key] = value;
      }
    } else {
      Object.assign(headers, init.headers);
    }
  }

  // Extract body
  let body: string | undefined;
  if (init?.body) {
    if (typeof init.body === "string") {
      body = init.body;
    } else if (init.body instanceof ArrayBuffer) {
      body = new TextDecoder().decode(init.body);
    } else if (init.body instanceof Uint8Array) {
      body = new TextDecoder().decode(init.body);
    } else {
      // ReadableStream or other — read it
      try {
        const blob = new Blob([init.body as BlobPart]);
        body = await blob.text();
      } catch {
        body = String(init.body);
      }
    }
  } else if (input instanceof Request && input.body) {
    try {
      body = await input.text();
    } catch {
      // Body already consumed
    }
  }

  const method =
    init?.method?.toUpperCase() ??
    (input instanceof Request ? input.method : "GET");

  // Send through proxy
  const proxyResponse = await originalFetch(PROXY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      method,
      headers,
      body,
    }),
    signal: init?.signal,
  });

  return proxyResponse;
}

let installed = false;

/**
 * Install the proxy fetch globally.
 * Call once at app startup.
 */
export function installProxyFetch(): void {
  if (installed) return;
  installed = true;
  globalThis.fetch = proxiedFetch as typeof globalThis.fetch;
}

/**
 * Restore the original fetch.
 */
export function uninstallProxyFetch(): void {
  if (!installed) return;
  installed = false;
  globalThis.fetch = originalFetch;
}
