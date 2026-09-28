// Absolute URLs for links that leave the app (emails) and for NextResponse.redirect(),
// which needs an absolute URL.
//
// Never derive these from the incoming request: behind a reverse proxy a route handler's
// req.url is the server's own bind address (http://localhost:3000), and the Host /
// X-Forwarded-Host headers are client-controlled (password-reset link poisoning).
// The public origin is configured instead, via APP_URL (e.g. https://album.example.com).

// Shared through globalThis, not module state: Next bundles instrumentation.ts and the
// route handlers separately, and the warning should still print only once per process.
const WARNED = Symbol.for("albumhelper.appUrlWarned");

function fallbackOrigin(): string {
  return `http://localhost:${process.env.PORT || 3000}`;
}

export function getPublicOrigin(): string {
  const raw = process.env.APP_URL?.trim();
  if (raw) {
    try {
      const url = new URL(raw);
      if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
    } catch {
      // invalid value: fall through to the fallback below
    }
  }

  const origin = fallbackOrigin();
  const flags = globalThis as unknown as Record<symbol, boolean | undefined>;
  if (!flags[WARNED]) {
    flags[WARNED] = true;
    console.warn(
      `⚠️ APP_URL is ${raw ? "not a valid http(s) URL" : "not set"}: emailed links and redirects will point at ${origin}`
    );
  }
  return origin;
}

/** Absolute public URL for an app path. `path` must start with "/". */
export function publicUrl(path: string): string {
  return `${getPublicOrigin()}${path}`;
}
