import { getGlobalDispatcher, setGlobalDispatcher, Agent, ProxyAgent } from 'undici';
import * as undici from 'undici';

function redactProxyUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) {
      parsed.username = parsed.username ? '***' : '';
      parsed.password = parsed.password ? '***' : '';
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
}

export function configureHttpDispatcher(): void {
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const proxy = httpsProxy || httpProxy;

  if (!proxy) {
    return;
  }

  try {
    // Try to use EnvHttpProxyAgent if available (similar to Pi's implementation)
    const dispatcher = new ProxyAgent(proxy);
    
    // Add error listener to prevent crashes on body stream teardown
    try {
      (dispatcher as any).on('error', () => {
        // Swallow dispatcher errors as per Pi's implementation
      });
    } catch {
      // ignore
    }
    
    setGlobalDispatcher(dispatcher);
    try {
      (undici as any).install?.();
    } catch {
      // ignore
    }
    
    console.log(`[http-proxy] Using proxy: ${redactProxyUrl(proxy)}`);
  } catch (err) {
    console.error('[http-proxy] Failed to configure proxy:', err);
  }
}

configureHttpDispatcher();
