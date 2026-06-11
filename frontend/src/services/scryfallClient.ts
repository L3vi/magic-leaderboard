/**
 * Shared, rate-limited Scryfall client.
 *
 * Scryfall asks for 50–100ms between requests (~10 req/sec). Bursts get an
 * HTTP 429 response which — critically — carries no Access-Control-Allow-Origin
 * header, so the browser surfaces it as an opaque "CORS policy" error rather
 * than a rate-limit. Every Scryfall request in the app funnels through
 * scryfallFetch so calls are serialized with safe spacing and 429s are retried
 * with backoff, instead of each caller bursting independently.
 */

const MIN_SPACING_MS = 110; // ~9 req/sec, comfortably under Scryfall's limit
const MAX_RETRIES = 2; // retries on 429 before giving up
const RETRY_BASE_MS = 1000;

let queueTail: Promise<unknown> = Promise.resolve();
let lastDispatch = 0;

async function dispatch(url: string, init?: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const since = Date.now() - lastDispatch;
    if (since < MIN_SPACING_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_SPACING_MS - since));
    }
    lastDispatch = Date.now();

    const response = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...(init?.headers || {}) },
    });
    if (response.status !== 429 || attempt >= MAX_RETRIES) {
      return response;
    }

    // Rate-limited: back off and retry. Honor Retry-After when present.
    const retryAfter = Number(response.headers.get("Retry-After"));
    const wait =
      Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : RETRY_BASE_MS * (attempt + 1);
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
}

/**
 * Fetch a Scryfall URL through the shared rate-limited queue.
 * Requests run one at a time, spaced >=110ms apart, with 429 backoff.
 */
export function scryfallFetch(url: string, init?: RequestInit): Promise<Response> {
  const result = queueTail.then(() => dispatch(url, init));
  // Keep the chain alive regardless of an individual request's outcome.
  queueTail = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}
