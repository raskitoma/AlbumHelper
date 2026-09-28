import { getPublicOrigin } from "./lib/publicUrl";

// Next.js calls register() once when a server instance starts (never during `next build`).
// Resolving the public origin here makes a missing or invalid APP_URL show up in the logs
// right after a (re)deploy, instead of only when the first email is sent.
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  getPublicOrigin();
}
