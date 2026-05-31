// Global feature flags.
//
// FREE_MODE (default ON): unlimited indexing for every user — no credit
// checks, no charges, and the pricing / credit UI is hidden. Set the
// environment variable FREE_MODE="false" to re-enable the paid credit system
// and the Razorpay top-up flow.
export const FREE_MODE = process.env.FREE_MODE !== "false";

// The app's own public base URL (no trailing slash). Used to build absolute
// links such as the IndexNow key location. Resolution order:
//   1. BASE_URL          — set this explicitly for your custom domain
//   2. VERCEL_URL        — auto-provided by Vercel for the deployment
//   3. http://localhost:3000 — local dev fallback
export const BASE_URL = (
  process.env.BASE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
).replace(/\/$/, "");
