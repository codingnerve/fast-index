// IndexNow submission — this is the genuinely-working, sanctioned engine.
// One POST notifies Bing, Yandex, Seznam, Naver and Yep simultaneously.
// Docs: https://www.indexnow.org/documentation

import { groupByHost } from "./validate";
import { BASE_URL } from "./config";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export type SubmitResult = {
  url: string;
  ok: boolean;
  message: string;
};

type IndexNowConfig = {
  key: string;
  keyLocation?: string;
};

function getConfig(): IndexNowConfig | null {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return null;
  // Fall back to the app's own key endpoint, derived from BASE_URL, when an
  // explicit INDEXNOW_KEY_LOCATION isn't provided.
  const keyLocation =
    process.env.INDEXNOW_KEY_LOCATION || `${BASE_URL}/api/indexnow-key`;
  return { key, keyLocation };
}

function describeStatus(status: number): { ok: boolean; message: string } {
  switch (status) {
    case 200:
      return { ok: true, message: "Accepted by IndexNow" };
    case 202:
      return { ok: true, message: "Accepted, pending key validation" };
    case 400:
      return { ok: false, message: "Bad request (invalid format)" };
    case 403:
      return { ok: false, message: "Key not valid / not found at keyLocation" };
    case 422:
      return { ok: false, message: "URL does not match host or key" };
    case 429:
      return { ok: false, message: "Rate limited — too many requests" };
    default:
      return { ok: false, message: `Unexpected status ${status}` };
  }
}

/**
 * Submit a batch of URLs (max 10,000 per IndexNow spec) that all share one host.
 */
async function submitHostBatch(
  host: string,
  urls: string[],
  config: IndexNowConfig
): Promise<SubmitResult[]> {
  const body: Record<string, unknown> = {
    host,
    key: config.key,
    urlList: urls.slice(0, 10000),
  };
  if (config.keyLocation) body.keyLocation = config.keyLocation;

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
    const { ok, message } = describeStatus(res.status);
    return urls.map((url) => ({ url, ok, message }));
  } catch (err) {
    const message =
      err instanceof Error ? `Network error: ${err.message}` : "Network error";
    return urls.map((url) => ({ url, ok: false, message }));
  }
}

/**
 * Submit any list of URLs to IndexNow. Automatically groups by host and
 * chunks into ≤10,000-URL batches. Returns one result per URL.
 *
 * If no INDEXNOW_KEY is configured, returns a "simulated" result so the app
 * is fully usable in local dev without external side effects.
 */
export async function submitToIndexNow(urls: string[]): Promise<SubmitResult[]> {
  const config = getConfig();
  if (!config) {
    return urls.map((url) => ({
      url,
      ok: true,
      message: "Simulated (set INDEXNOW_KEY to submit for real)",
    }));
  }

  const results: SubmitResult[] = [];
  for (const [host, hostUrls] of groupByHost(urls)) {
    for (let i = 0; i < hostUrls.length; i += 10000) {
      const batch = hostUrls.slice(i, i + 10000);
      results.push(...(await submitHostBatch(host, batch, config)));
    }
  }
  return results;
}
