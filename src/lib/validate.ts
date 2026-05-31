// URL parsing, normalization, de-duplication and basic validity checks.
// Runs BEFORE any credits are spent — mirrors the "validate first" step
// real indexing services advertise.

export type ParsedUrls = {
  valid: string[]; // normalized, unique, http(s)
  duplicates: string[]; // dropped because they repeat an earlier entry
  invalid: { raw: string; reason: string }[];
};

/** Normalize a single URL string, or return null if it cannot be used. */
export function normalizeUrl(raw: string): { url: string } | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { error: "empty" };

  let candidate = trimmed;
  // Add a protocol if the user pasted a bare domain.
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = "https://" + candidate;
  }

  let u: URL;
  try {
    u = new URL(candidate);
  } catch {
    return { error: "not a valid URL" };
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { error: "only http/https supported" };
  }
  if (!u.hostname.includes(".")) {
    return { error: "hostname has no TLD" };
  }

  // Drop the fragment — search engines index without it.
  u.hash = "";
  // Lowercase the host, keep path/query as-is (paths can be case-sensitive).
  u.hostname = u.hostname.toLowerCase();

  return { url: u.toString() };
}

/** Parse a blob of pasted text or CSV-extracted lines into buckets. */
export function parseUrlList(lines: string[]): ParsedUrls {
  const valid: string[] = [];
  const duplicates: string[] = [];
  const invalid: { raw: string; reason: string }[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (!line.trim()) continue;
    const result = normalizeUrl(line);
    if ("error" in result) {
      invalid.push({ raw: line.trim(), reason: result.error });
      continue;
    }
    if (seen.has(result.url)) {
      duplicates.push(result.url);
      continue;
    }
    seen.add(result.url);
    valid.push(result.url);
  }

  return { valid, duplicates, invalid };
}

/** Split raw textarea or CSV text into candidate lines (handles commas + newlines). */
export function splitInput(text: string): string[] {
  return text
    .split(/[\r\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Group URLs by host — IndexNow requires one submission per host. */
export function groupByHost(urls: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const url of urls) {
    const host = new URL(url).hostname;
    const arr = map.get(host) ?? [];
    arr.push(url);
    map.set(host, arr);
  }
  return map;
}
