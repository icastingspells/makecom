import { ProxyAgent, fetch as undiciFetch } from 'undici';

let proxyAgent: ProxyAgent | undefined;
let activeProxy: string | undefined;

/** Optional proxy applies only to OpenRouter, never to Supabase or local traffic. */
export async function openRouterFetch(url: string, options: RequestInit): Promise<Response> {
  const proxy = process.env.OPENROUTER_PROXY_URL?.trim();
  if (!proxy) return fetch(url, options);
  if (!proxyAgent || activeProxy !== proxy) {
    await proxyAgent?.close();
    proxyAgent = new ProxyAgent(proxy);
    activeProxy = proxy;
  }
  return undiciFetch(url, { ...options, dispatcher: proxyAgent } as Parameters<typeof undiciFetch>[1]) as unknown as Promise<Response>;
}
