// Google Search Console URL Inspection API — checks whether a URL is actually
// indexed by Google (the honest "is it really in the index?" check).
//
// Requirements to use live:
//  - GOOGLE_SERVICE_ACCOUNT_JSON set
//  - The service account added as an owner/full user of the GSC property
//  - The property (siteUrl) verified in Search Console
import { getServiceAccount, getAccessToken } from "./googleAuth";

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export type InspectionResult = {
  url: string;
  ok: boolean;
  verdict?: string; // PASS | NEUTRAL | FAIL
  coverageState?: string; // e.g. "Submitted and indexed", "Crawled - currently not indexed"
  lastCrawlTime?: string;
  robotsTxtState?: string;
  message?: string;
};

export function isGscConfigured(): boolean {
  return !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
}

export async function inspectUrl(
  inspectionUrl: string,
  siteUrl: string
): Promise<InspectionResult> {
  const sa = getServiceAccount();
  if (!sa) {
    return {
      url: inspectionUrl,
      ok: false,
      message: "GSC not configured (set GOOGLE_SERVICE_ACCOUNT_JSON)",
    };
  }

  let token: string;
  try {
    token = await getAccessToken(sa, SCOPE);
  } catch (err) {
    return {
      url: inspectionUrl,
      ok: false,
      message: err instanceof Error ? err.message : "auth failed",
    };
  }

  try {
    const res = await fetch(
      "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inspectionUrl, siteUrl }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return {
        url: inspectionUrl,
        ok: false,
        message: `GSC API ${res.status}: ${text.slice(0, 160)}`,
      };
    }

    const data = (await res.json()) as {
      inspectionResult?: {
        indexStatusResult?: {
          verdict?: string;
          coverageState?: string;
          lastCrawlTime?: string;
          robotsTxtState?: string;
        };
      };
    };
    const idx = data.inspectionResult?.indexStatusResult;
    return {
      url: inspectionUrl,
      ok: true,
      verdict: idx?.verdict,
      coverageState: idx?.coverageState,
      lastCrawlTime: idx?.lastCrawlTime,
      robotsTxtState: idx?.robotsTxtState,
    };
  } catch (err) {
    return {
      url: inspectionUrl,
      ok: false,
      message: err instanceof Error ? err.message : "request failed",
    };
  }
}
