// Google submission helpers.
//
// IMPORTANT HONESTY NOTE: Google's Indexing API is officially documented for
// JobPosting and BroadcastEvent pages only. Using it for arbitrary URLs may
// trigger a crawl but is outside its supported scope and carries some risk.
// We expose it as an OPTIONAL engine, disabled unless a service account is set.
//
// The always-safe Google action we take is the sitemap/URL ping, which simply
// asks Google to crawl — it never guarantees indexing (nothing can).

import type { SubmitResult } from "./indexnow";
import { getServiceAccount, getAccessToken } from "./googleAuth";

const INDEXING_SCOPE = "https://www.googleapis.com/auth/indexing";

/**
 * Submit URLs to the Google Indexing API (URL_UPDATED).
 * Returns simulated results when no service account is configured.
 */
export async function submitToGoogle(urls: string[]): Promise<SubmitResult[]> {
  const sa = getServiceAccount();
  if (!sa) {
    return urls.map((url) => ({
      url,
      ok: true,
      message: "Simulated (set GOOGLE_SERVICE_ACCOUNT_JSON to enable)",
    }));
  }

  let token: string;
  try {
    token = await getAccessToken(sa, INDEXING_SCOPE);
  } catch (err) {
    const message = err instanceof Error ? err.message : "auth failed";
    return urls.map((url) => ({ url, ok: false, message }));
  }

  // The Indexing API only accepts one URL per request.
  const results: SubmitResult[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(
        "https://indexing.googleapis.com/v3/urlNotifications:publish",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ url, type: "URL_UPDATED" }),
        }
      );
      if (res.ok) {
        results.push({ url, ok: true, message: "Submitted to Google Indexing API" });
      } else {
        const text = await res.text();
        results.push({
          url,
          ok: false,
          message: `Google API ${res.status}: ${text.slice(0, 120)}`,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "request failed";
      results.push({ url, ok: false, message });
    }
  }
  return results;
}

/**
 * Always-safe action: ping Google to fetch a sitemap. This is the sanctioned
 * way to nudge discovery for your own site.
 */
export async function pingSitemap(sitemapUrl: string): Promise<SubmitResult> {
  const endpoint = `https://www.google.com/ping?sitemap=${encodeURIComponent(
    sitemapUrl
  )}`;
  try {
    const res = await fetch(endpoint, { method: "GET" });
    return {
      url: sitemapUrl,
      ok: res.ok,
      message: res.ok ? "Sitemap ping accepted" : `Ping failed (${res.status})`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "ping failed";
    return { url: sitemapUrl, ok: false, message };
  }
}
