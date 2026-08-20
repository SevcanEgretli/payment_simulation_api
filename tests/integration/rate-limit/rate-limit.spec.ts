import { test, expect } from '@playwright/test';
import { baseURL, apiKey } from '@config/env';
import type { ApiError } from '@utils/types';

// Exhausts the key's rate limit for the rest of that 60s window - never
// chain this directly before other tests.
test.skip(
  !process.env.RUN_RATE_LIMIT_TEST,
  'Exhausts the shared API key\'s rate limit - run explicitly via `npm run test:rate-limit`.'
);

// Per the docs: 300 requests/minute per API key.
const RATE_LIMIT_PER_MINUTE = 300;
const REQUEST_BUFFER = 20; // send a few extra so timing slop can't make us fall short
const BATCH_CONCURRENCY = 20; // fire in concurrent batches to fit inside the 60s window

test('returns 429 with a Retry-After header once the per-minute limit is exceeded', async () => {
  test.setTimeout(60_000);

  const totalRequests = RATE_LIMIT_PER_MINUTE + REQUEST_BUFFER;
  let rateLimited: Response | undefined;

  for (let sent = 0; sent < totalRequests && !rateLimited; sent += BATCH_CONCURRENCY) {
    const batchSize = Math.min(BATCH_CONCURRENCY, totalRequests - sent);
    const batch = await Promise.all(
      Array.from({ length: batchSize }, () =>
        // Cheap endpoint - counts toward the limit without creating real resources.
        fetch(`${baseURL}/payment-methods/pm_definitely_missing`, {
          headers: { 'X-Api-Key': apiKey },
        })
      )
    );
    rateLimited = batch.find((response) => response.status === 429);
  }

  expect(rateLimited, `Expected a 429 within ${totalRequests} requests`).toBeDefined();
  expect(rateLimited!.headers.get('retry-after')).toBeTruthy();

  const body: ApiError = await rateLimited!.json();
  expect(body.error.code).toBe('rate_limited');
});
