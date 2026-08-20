import { test, expect, request as playwrightRequest } from '@playwright/test';
import { baseURL, apiKey } from '@config/env';
import type { ApiError } from '@utils/types';

test.describe('Authentication', () => {
  test('rejects requests with no X-Api-Key header', async () => {
    const response = await fetch(`${baseURL}/payment-methods/pm_definitely_missing`);

    expect(response.status).toBe(401);
    const body: ApiError = await response.json();
    expect(body.error.code).toBe('invalid_api_key');
  });

  test('rejects requests with an unknown X-Api-Key', async () => {
    const context = await playwrightRequest.newContext({
      baseURL,
      extraHTTPHeaders: { 'X-Api-Key': 'not-a-real-key' },
    });
    const response = await context.get('/payment-methods/pm_definitely_missing');

    expect(response.status()).toBe(401);
    const body: ApiError = await response.json();
    expect(body.error.code).toBe('invalid_api_key');

    await context.dispose();
  });

  test('accepts requests with a valid X-Api-Key', async ({ request }) => {
    const response = await request.get('/payment-methods/pm_definitely_missing');
    expect(response.status()).toBe(404);
    expect(apiKey).toBeTruthy();
  });
});
