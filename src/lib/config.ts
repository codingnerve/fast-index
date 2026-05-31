// Global feature flags.
//
// FREE_MODE (default ON): unlimited indexing for every user — no credit
// checks, no charges, and the pricing / credit UI is hidden. Set the
// environment variable FREE_MODE="false" to re-enable the paid credit system
// and the Razorpay top-up flow.
export const FREE_MODE = process.env.FREE_MODE !== "false";
